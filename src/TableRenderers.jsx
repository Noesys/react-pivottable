import React from 'react';
import PropTypes from 'prop-types';
import { PivotData } from './Utilities';
import _ from 'lodash';

// helper function for setting row/col-span in pivotTableRenderer
const spanSize = function (arr, i, j) {
  let x;
  if (i !== 0) {
    let asc, end;
    let noDraw = true;
    for (
      x = 0, end = j, asc = end >= 0;
      asc ? x <= end : x >= end;
      asc ? x++ : x--
    ) {
      if (arr[i - 1][x] !== arr[i][x]) {
        noDraw = false;
      }
    }
    if (noDraw) {
      return -1;
    }
  }
  let len = 0;
  while (i + len < arr.length) {
    let asc1, end1;
    let stop = false;
    for (
      x = 0, end1 = j, asc1 = end1 >= 0;
      asc1 ? x <= end1 : x >= end1;
      asc1 ? x++ : x--
    ) {
      if (arr[i][x] !== arr[i + len][x]) {
        stop = true;
      }
    }
    if (stop) {
      break;
    }
    len++;
  }
  return len;
};

function redColorScaleGenerator(values) {
  const min = Math.min.apply(Math, values);
  const max = Math.max.apply(Math, values);
  return x => {
    // eslint-disable-next-line no-magic-numbers
    const nonRed = 255 - Math.round(255 * (x - min) / (max - min));
    return { backgroundColor: `rgb(255,${nonRed},${nonRed})` };
  };
}

function makeRenderer(opts = {}) {
  class TableRenderer extends React.PureComponent {
    render() {
      const pivotData = new PivotData(this.props);
      const colAttrs = pivotData.props.cols;
      const rowAttrs = pivotData.props.rows;
      const rowKeys = pivotData.getRowKeys();
      const colKeys = pivotData.getColKeys();
      const grandTotalAggregator = pivotData.getAggregator([], []);
      
      let hideRowTotal = (pivotData.props.hideRowTotal) ? "none" : "table-cell";
      let hideColTotal = (pivotData.props.hideColTotal) ? "none" : "table-cell";
      
      let valueCellColors = () => { };
      let rowTotalColors = () => { };
      let colTotalColors = () => { };
      if (opts.heatmapMode) {
        const colorScaleGenerator = this.props.tableColorScaleGenerator;
        const rowTotalValues = colKeys.map(x =>
          pivotData.getAggregator([], x).value()
        );
        rowTotalColors = colorScaleGenerator(rowTotalValues);
        const colTotalValues = rowKeys.map(x =>
          pivotData.getAggregator(x, []).value()
        );
        colTotalColors = colorScaleGenerator(colTotalValues);

        if (opts.heatmapMode === 'full') {
          const allValues = [];
          rowKeys.map(r =>
            colKeys.map(c =>
              allValues.push(pivotData.getAggregator(r, c).value())
            )
          );
          const colorScale = colorScaleGenerator(allValues);
          valueCellColors = (r, c, v) => colorScale(v);
        } else if (opts.heatmapMode === 'row') {
          const rowColorScales = {};
          rowKeys.map(r => {
            const rowValues = colKeys.map(x =>
              pivotData.getAggregator(r, x).value()
            );
            rowColorScales[r] = colorScaleGenerator(rowValues);
          });
          valueCellColors = (r, c, v) => rowColorScales[r](v);
        } else if (opts.heatmapMode === 'col') {
          const colColorScales = {};
          colKeys.map(c => {
            const colValues = rowKeys.map(x =>
              pivotData.getAggregator(x, c).value()
            );
            colColorScales[c] = colorScaleGenerator(colValues);
          });
          valueCellColors = (r, c, v) => colColorScales[c](v);
        }
      }

      return (
        <table className="pvtTable"
          style={{
            fontFamily: pivotData.props.fontFamily, fontSize: pivotData.props.fontSize + "pt"
          }}>
          <thead>
            {colAttrs.map(function (c, j) {
              return (
                <tr key={`colAttr${j}`}>
                  {j === 0 &&
                    rowAttrs.length !== 0 && (
                      <th style={{ backgroundColor: pivotData.props.backgroundColor }} colSpan={rowAttrs.length} rowSpan={colAttrs.length} />
                    )}
                  <th className="pvtAxisLabel" style={{
                    backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                    fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                  }}>{c}</th>
                  {colKeys.map(function (colKey, i) {
                    const x = spanSize(colKeys, i, j);
                    if (x === -1) {
                      return null;
                    }
                    return (
                      <th
                        className="pvtColLabel"
                        style={{
                          backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                          fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                        }}
                        key={`colKey${i}`}
                        colSpan={x}
                        rowSpan={
                          j === colAttrs.length - 1 && rowAttrs.length !== 0
                            ? 2
                            : 1
                        }
                      >
                        {colKey[j]}
                      </th>
                    );
                  })}

                  {j === 0 && (
                    <th
                      className="pvtTotalLabel"
                      style={{
                        backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                        fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle, display: hideRowTotal
                      }}
                      rowSpan={
                        colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)
                      }
                    >
                      Totals
                    </th>
                  )}
                </tr>
              );
            })}

            {rowAttrs.length !== 0 && (
              <tr>
                {rowAttrs.map(function (r, i) {
                  return (
                    <th className="pvtAxisLabel" key={`rowAttr${i}`} style={{
                      backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                      fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                    }}>
                      {r}
                    </th>
                  );
                })}
                <th className="pvtTotalLabel"
                  style={{
                    backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                    fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                  }}>
                  {colAttrs.length === 0 ? 'Totals' : null}
                </th>
              </tr>
            )}
          </thead>

          <tbody>
            {rowKeys.map(function (rowKey, i) {
              const totalAggregator = pivotData.getAggregator(rowKey, []);
              // To find Index of Measure
              let getAllMeasures = pivotData.props.vals.filter(d => d != "MeasureVal");
              let findRow = pivotData.props.rows.filter(d => d === "Measure");
              let getIndex = 0;
              if (findRow.length > 0) {
                let getElement = getAllMeasures.filter(element => rowKey.includes(element));
                if (getElement.length > 0) {
                  getIndex = (getAllMeasures.indexOf(getElement[0]) < 0) ? 0 : getAllMeasures.indexOf(getElement[0]);
                }
              }
              return (
                <tr key={`rowKeyRow${i}`}>
                  {rowKey.map(function (txt, j) {
                    const x = spanSize(rowKeys, i, j);
                    if (x === -1) {
                      return null;
                    }
                    return (
                      <th
                        key={`rowKeyLabel${i}-${j}`}
                        className="pvtRowLabel"
                        style={{
                          backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                          fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                        }}
                        rowSpan={x}
                        colSpan={
                          j === rowAttrs.length - 1 && colAttrs.length !== 0
                            ? 2
                            : 1
                        }
                      >
                        {txt}
                      </th>
                    );
                  })}
                  {colKeys.map(function (colKey, j) {
                    const aggregator = pivotData.getAggregator(rowKey, colKey);
                    // To find Index of Measure
                    let getAllMeasures = pivotData.props.vals.filter(d => d != "MeasureVal");
                    let findCol = pivotData.props.cols.filter(d => d === "Measure");
                    let findRow = pivotData.props.rows.filter(d => d === "Measure");
                    let getIndex = 0;
                    if (findCol.length > 0) {
                      let getElement = getAllMeasures.filter(element => colKey.includes(element));
                      if (getElement.length > 0) {
                        getIndex = (getAllMeasures.indexOf(getElement[0]) < 0) ? 0 : getAllMeasures.indexOf(getElement[0]);
                      }
                    } else if (findRow.length > 0) {
                      let getElement = getAllMeasures.filter(element => rowKey.includes(element));
                      if (getElement.length > 0) {
                        getIndex = (getAllMeasures.indexOf(getElement[0]) < 0) ? 0 : getAllMeasures.indexOf(getElement[0]);
                      }
                    }
                    return (
                      <td
                        className="pvtVal"
                        key={`pvtVal${i}-${j}`}
                        style={_.merge(valueCellColors(rowKey, colKey, aggregator.value()),
                          { fontWeight: pivotData.props.fontDataWeight }, { fontStyle: pivotData.props.fontDataStyle })}
                      >
                        {(pivotData.props.valueFormatter != null) ?
                          pivotData.props.valueFormatter[getIndex](aggregator.value()) :
                          aggregator.format(aggregator.value())
                        }
                      </td>
                    );
                  })}
                  {(pivotData.props.hideRowTotal) ? null :
                  <td
                    className="pvtTotal"
                    style={_.merge(colTotalColors(totalAggregator.value()),
                      { fontWeight: pivotData.props.fontDataWeight }, { fontStyle: pivotData.props.fontDataStyle })}
                  >
                    {(pivotData.props.valueFormatter != null && findRow.length > 0) ?
                      pivotData.props.valueFormatter[getIndex](totalAggregator.value()) :
                      totalAggregator.format(totalAggregator.value())
                    }
                  </td>}
                </tr>
              );
            })}

            <tr>
              {(pivotData.props.hideColTotal) ? null :
              <th
                style={{
                  backgroundColor: pivotData.props.backgroundColor, fontSize: pivotData.props.fontSize + "pt",
                  fontWeight: pivotData.props.fontLabelWeight, fontStyle: pivotData.props.fontLabelStyle
                }}
                className="pvtTotalLabel"
                colSpan={rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)}
              >
                Totals
              </th>}

              {colKeys.map(function (colKey, i) {
                const totalAggregator = pivotData.getAggregator([], colKey);
                // To find Index of Measure
                let getAllMeasures = pivotData.props.vals.filter(d => d != "MeasureVal");
                let findCol = pivotData.props.cols.filter(d => d === "Measure");
                let getIndex = 0;
                if (findCol.length > 0) {
                  let getElement = getAllMeasures.filter(element => colKey.includes(element));
                  if (getElement.length > 0) {
                    getIndex = (getAllMeasures.indexOf(getElement[0]) < 0) ? 0 : getAllMeasures.indexOf(getElement[0]);
                  }
                }
                return (
                  <td
                    className="pvtTotal"
                    key={`total${i}`}
                    style={_.merge(rowTotalColors(totalAggregator.value()), {fontWeight: pivotData.props.fontDataWeight}, 
                    {fontStyle: pivotData.props.fontDataStyle}, {display: hideColTotal})}
                  >
                    {(pivotData.props.valueFormatter != null && findCol.length > 0) ?
                      pivotData.props.valueFormatter[getIndex](totalAggregator.value()) :
                      totalAggregator.format(totalAggregator.value())
                    }
                  </td>
                );
              })}
              {(pivotData.props.hideRowTotal || pivotData.props.hideColTotal) ? null :
              <td className="pvtGrandTotal" style={{ fontWeight: pivotData.props.fontDataWeight, fontStyle: pivotData.props.fontDataStyle }}>
                {grandTotalAggregator.format(grandTotalAggregator.value())}
              </td> }
            </tr>
          </tbody>
        </table>
      );
    }
  }

  TableRenderer.defaultProps = PivotData.defaultProps;
  TableRenderer.propTypes = PivotData.propTypes;
  TableRenderer.defaultProps.tableColorScaleGenerator = redColorScaleGenerator;
  TableRenderer.propTypes.tableColorScaleGenerator = PropTypes.func;
  return TableRenderer;
}

class TSVExportRenderer extends React.PureComponent {
  render() {
    const pivotData = new PivotData(this.props);
    const rowKeys = pivotData.getRowKeys();
    const colKeys = pivotData.getColKeys();
    if (rowKeys.length === 0) {
      rowKeys.push([]);
    }
    if (colKeys.length === 0) {
      colKeys.push([]);
    }

    const headerRow = pivotData.props.rows.map(r => r);
    if (colKeys.length === 1 && colKeys[0].length === 0) {
      headerRow.push(this.props.aggregatorName);
    } else {
      colKeys.map(c => headerRow.push(c.join('-')));
    }

    const result = rowKeys.map(r => {
      const row = r.map(x => x);
      colKeys.map(c => {
        const v = pivotData.getAggregator(r, c).value();
        row.push(v ? v : '');
      });
      return row;
    });

    result.unshift(headerRow);

    return (
      <textarea
        value={result.map(r => r.join('\t')).join('\n')}
        style={{ width: window.innerWidth / 2, height: window.innerHeight / 2 }}
        readOnly={true}
      />
    );
  }
}

TSVExportRenderer.defaultProps = PivotData.defaultProps;
TSVExportRenderer.propTypes = PivotData.propTypes;

export default {
  Table: makeRenderer(),
  'Table Heatmap': makeRenderer({ heatmapMode: 'full' }),
  'Table Col Heatmap': makeRenderer({ heatmapMode: 'col' }),
  'Table Row Heatmap': makeRenderer({ heatmapMode: 'row' }),
  'Exportable TSV': TSVExportRenderer,
};
