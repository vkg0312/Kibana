/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getRangeBucketAgg } from '../range';
import { createFilterRange } from './range';
import { BytesFormat, FieldFormatsGetConfigFn } from '../../../../../common';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { FieldFormatsStart } from '../../../../field_formats';
import { fieldFormatsServiceMock } from '../../../../field_formats/mocks';
import { GetInternalStartServicesFn, InternalStartServices } from '../../../../types';

describe('AggConfig Filters', () => {
  describe('range', () => {
    let getInternalStartServices: GetInternalStartServicesFn;
    let fieldFormats: FieldFormatsStart;

    beforeEach(() => {
      fieldFormats = fieldFormatsServiceMock.createStartContract();

      getInternalStartServices = () =>
        (({
          fieldFormats,
        } as unknown) as InternalStartServices);
    });

    const getConfig = (() => {}) as FieldFormatsGetConfigFn;
    const getAggConfigs = () => {
      const field = {
        name: 'bytes',
        format: new BytesFormat({}, getConfig),
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            id: BUCKET_TYPES.RANGE,
            type: BUCKET_TYPES.RANGE,
            schema: 'buckets',
            params: {
              field: 'bytes',
              ranges: [{ from: 1024, to: 2048 }],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry([getRangeBucketAgg({ getInternalStartServices })]),
        }
      );
    };

    test('should return a range filter for range agg', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterRange(getInternalStartServices)(
        aggConfigs.aggs[0] as IBucketAggConfig,
        {
          gte: 1024,
          lt: 2048.0,
        }
      );

      expect(fieldFormats.deserialize).toHaveBeenCalledTimes(1);
      expect(filter).toHaveProperty('range');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.range).toHaveProperty('bytes');
      expect(filter.range.bytes).toHaveProperty('gte', 1024.0);
      expect(filter.range.bytes).toHaveProperty('lt', 2048.0);
      expect(filter.meta).toHaveProperty('formattedValue');
    });
  });
});
