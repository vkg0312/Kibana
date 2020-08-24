/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import { timeMilliseconds } from 'd3-time';
import * as runtimeTypes from 'io-ts';
import { compact, first, get, has } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity, constant } from 'fp-ts/lib/function';
import { RequestHandlerContext } from 'src/core/server';
import { JsonObject, JsonValue } from '../../../../common/typed_json';
import {
  LogEntriesAdapter,
  LogEntriesParams,
  LogEntryDocument,
  LogEntryQuery,
  LogSummaryBucket,
  LOG_ENTRIES_PAGE_SIZE,
} from '../../domains/log_entries_domain';
import { InfraSourceConfiguration } from '../../sources';
import { SortedSearchHit } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';

const TIMESTAMP_FORMAT = 'epoch_millis';

interface LogItemHit {
  _index: string;
  _id: string;
  _source: JsonObject;
  sort: [number, number];
}

export class InfraKibanaLogEntriesAdapter implements LogEntriesAdapter {
  constructor(private readonly framework: KibanaFramework) {}

  public async getLogEntries(
    requestContext: RequestHandlerContext,
    sourceConfiguration: InfraSourceConfiguration,
    fields: string[],
    params: LogEntriesParams
  ): Promise<LogEntryDocument[]> {
    const { startTimestamp, endTimestamp, query, cursor, size, highlightTerm } = params;

    const { sortDirection, searchAfterClause } = processCursor(cursor);

    const highlightQuery = createHighlightQuery(highlightTerm, fields);

    const highlightClause = highlightQuery
      ? {
          highlight: {
            boundary_scanner: 'word',
            fields: fields.reduce(
              (highlightFieldConfigs, fieldName) => ({
                ...highlightFieldConfigs,
                [fieldName]: {},
              }),
              {}
            ),
            fragment_size: 1,
            number_of_fragments: 100,
            post_tags: [''],
            pre_tags: [''],
            highlight_query: highlightQuery,
          },
        }
      : {};

    const sort = {
      [sourceConfiguration.fields.timestamp]: sortDirection,
      [sourceConfiguration.fields.tiebreaker]: sortDirection,
    };

    const esQuery = {
      allowNoIndices: true,
      index: sourceConfiguration.logAlias,
      ignoreUnavailable: true,
      body: {
        size: typeof size !== 'undefined' ? size : LOG_ENTRIES_PAGE_SIZE,
        track_total_hits: false,
        _source: fields,
        query: {
          bool: {
            filter: [
              ...createFilterClauses(query, highlightQuery),
              {
                range: {
                  [sourceConfiguration.fields.timestamp]: {
                    gte: startTimestamp,
                    lte: endTimestamp,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        sort,
        ...highlightClause,
        ...searchAfterClause,
      },
    };

    const esResult = await this.framework.callWithRequest<SortedSearchHit>(
      requestContext,
      'search',
      esQuery
    );

    const hits = sortDirection === 'asc' ? esResult.hits.hits : esResult.hits.hits.reverse();
    return mapHitsToLogEntryDocuments(hits, fields);
  }

  public async getContainedLogSummaryBuckets(
    requestContext: RequestHandlerContext,
    sourceConfiguration: InfraSourceConfiguration,
    startTimestamp: number,
    endTimestamp: number,
    bucketSize: number,
    filterQuery?: LogEntryQuery
  ): Promise<LogSummaryBucket[]> {
    const bucketIntervalStarts = timeMilliseconds(
      new Date(startTimestamp),
      new Date(endTimestamp),
      bucketSize
    );

    const query = {
      allowNoIndices: true,
      index: sourceConfiguration.logAlias,
      ignoreUnavailable: true,
      body: {
        aggregations: {
          count_by_date: {
            date_range: {
              field: sourceConfiguration.fields.timestamp,
              format: TIMESTAMP_FORMAT,
              ranges: bucketIntervalStarts.map((bucketIntervalStart) => ({
                from: bucketIntervalStart.getTime(),
                to: bucketIntervalStart.getTime() + bucketSize,
              })),
            },
            aggregations: {
              top_hits_by_key: {
                top_hits: {
                  size: 1,
                  sort: [
                    { [sourceConfiguration.fields.timestamp]: 'asc' },
                    { [sourceConfiguration.fields.tiebreaker]: 'asc' },
                  ],
                  _source: false,
                },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [
              ...createQueryFilterClauses(filterQuery),
              {
                range: {
                  [sourceConfiguration.fields.timestamp]: {
                    gte: startTimestamp,
                    lte: endTimestamp,
                    format: TIMESTAMP_FORMAT,
                  },
                },
              },
            ],
          },
        },
        size: 0,
        track_total_hits: false,
      },
    };

    const response = await this.framework.callWithRequest<any, {}>(requestContext, 'search', query);

    return pipe(
      LogSummaryResponseRuntimeType.decode(response),
      map((logSummaryResponse) =>
        logSummaryResponse.aggregations.count_by_date.buckets.map(
          convertDateRangeBucketToSummaryBucket
        )
      ),
      fold(constant([]), identity)
    );
  }

  public async getLogItem(
    requestContext: RequestHandlerContext,
    id: string,
    sourceConfiguration: InfraSourceConfiguration
  ) {
    const search = (searchOptions: object) =>
      this.framework.callWithRequest<LogItemHit, {}>(requestContext, 'search', searchOptions);

    const params = {
      index: sourceConfiguration.logAlias,
      terminate_after: 1,
      body: {
        size: 1,
        sort: [
          { [sourceConfiguration.fields.timestamp]: 'desc' },
          { [sourceConfiguration.fields.tiebreaker]: 'desc' },
        ],
        query: {
          ids: {
            values: [id],
          },
        },
      },
    };

    const response = await search(params);
    const document = first(response.hits.hits);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  }
}

function mapHitsToLogEntryDocuments(hits: SortedSearchHit[], fields: string[]): LogEntryDocument[] {
  return hits.map((hit) => {
    const logFields = fields.reduce<{ [fieldName: string]: JsonValue }>(
      (flattenedFields, field) => {
        if (has(hit._source, field)) {
          flattenedFields[field] = get(hit._source, field);
        }
        return flattenedFields;
      },
      {}
    );

    return {
      id: hit._id,
      cursor: { time: hit.sort[0], tiebreaker: hit.sort[1] },
      fields: logFields,
      highlights: hit.highlight || {},
    };
  });
}

const convertDateRangeBucketToSummaryBucket = (
  bucket: LogSummaryDateRangeBucket
): LogSummaryBucket => ({
  entriesCount: bucket.doc_count,
  start: bucket.from || 0,
  end: bucket.to || 0,
  topEntryKeys: bucket.top_hits_by_key.hits.hits.map((hit) => ({
    tiebreaker: hit.sort[1],
    time: hit.sort[0],
  })),
});

const createHighlightQuery = (
  highlightTerm: string | undefined,
  fields: string[]
): LogEntryQuery | undefined => {
  if (highlightTerm) {
    return {
      multi_match: {
        fields,
        lenient: true,
        query: highlightTerm,
        type: 'phrase',
      },
    };
  }
};

const createFilterClauses = (
  filterQuery?: LogEntryQuery,
  highlightQuery?: LogEntryQuery
): LogEntryQuery[] => {
  if (filterQuery && highlightQuery) {
    return [{ bool: { filter: [filterQuery, highlightQuery] } }];
  }

  return compact([filterQuery, highlightQuery]) as LogEntryQuery[];
};

const createQueryFilterClauses = (filterQuery: LogEntryQuery | undefined) =>
  filterQuery ? [filterQuery] : [];

function processCursor(
  cursor: LogEntriesParams['cursor']
): {
  sortDirection: 'asc' | 'desc';
  searchAfterClause: { search_after?: readonly [number, number] };
} {
  if (cursor) {
    if ('before' in cursor) {
      return {
        sortDirection: 'desc',
        searchAfterClause:
          cursor.before !== 'last'
            ? { search_after: [cursor.before.time, cursor.before.tiebreaker] as const }
            : {},
      };
    } else if (cursor.after !== 'first') {
      return {
        sortDirection: 'asc',
        searchAfterClause: { search_after: [cursor.after.time, cursor.after.tiebreaker] as const },
      };
    }
  }

  return { sortDirection: 'asc', searchAfterClause: {} };
}

const LogSummaryDateRangeBucketRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    doc_count: runtimeTypes.number,
    key: runtimeTypes.string,
    top_hits_by_key: runtimeTypes.type({
      hits: runtimeTypes.type({
        hits: runtimeTypes.array(
          runtimeTypes.type({
            sort: runtimeTypes.tuple([runtimeTypes.number, runtimeTypes.number]),
          })
        ),
      }),
    }),
  }),
  runtimeTypes.partial({
    from: runtimeTypes.number,
    to: runtimeTypes.number,
  }),
]);

export interface LogSummaryDateRangeBucket
  extends runtimeTypes.TypeOf<typeof LogSummaryDateRangeBucketRuntimeType> {}

const LogSummaryResponseRuntimeType = runtimeTypes.type({
  aggregations: runtimeTypes.type({
    count_by_date: runtimeTypes.type({
      buckets: runtimeTypes.array(LogSummaryDateRangeBucketRuntimeType),
    }),
  }),
});

export interface LogSummaryResponse
  extends runtimeTypes.TypeOf<typeof LogSummaryResponseRuntimeType> {}
