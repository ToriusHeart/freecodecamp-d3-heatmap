import './style.css'
import * as d3 from "d3"

const margin = {top: 30, right: 30, bottom: 90, left: 70};
const w = 1200 - margin.left - margin.right;
const h = 520 - margin.top - margin.bottom;

const colors = [
  '#a50026',
  '#d73027',
  '#f46d43',
  '#fdae61',
  '#fee090',
  '#ffffbf',
  '#e0f3f8',
  '#abd9e9',
  '#74add1',
  '#4575b4',
  '#313695'
].reverse();
interface DataInterface {
  year: number;
  month: number;
  variance: number;
}

interface JSONInterface {
  baseTemperature: number;
  monthlyVariance: DataInterface[];
}


fetch("https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json")
  .then((response) => response.json())
  .then((data: JSONInterface) => {
    const baseTemperature = data.baseTemperature;
    const dataset: DataInterface[] = data.monthlyVariance.map(
      (d: DataInterface) => {
        return {...d, month: d.month - 1}
      }
    );
    const datasetYears: number[] = [...new Set(dataset.map((d: DataInterface) => d.year))].sort((a, b) => a - b);
    const datasetMonths: number[] = d3.range(0, 12);
    const datasetVariances: number[] = dataset.map((d: DataInterface) => d.variance);
    const minTemp = baseTemperature + d3.min(datasetVariances)!;
    const maxTemp = baseTemperature + d3.max(datasetVariances)!;

    d3.select("#description")
      .text(`${d3.min(datasetYears)} - ${d3.max(datasetYears)}: base temperature ${baseTemperature}℃`);

    const svg = d3.select("#chart")
                  .attr("width", w + margin.left + margin.right)
                  .attr("height", h + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand<string>()
                    .range([0, w])
                    .domain(datasetYears.map(String));
    
    const yScale = d3.scaleBand<string>()
                    .range([0, h])
                    .domain(datasetMonths.map(String));

    const xAxis = d3.axisBottom<string>(xScale).tickFormat((year: string) => {
      const date = new Date(year);
      const format = d3.utcFormat("%Y");
      return format(date); 
    })
    .tickValues(datasetYears.filter((year: number) => year % 10 === 0).map(String));

    const yAxis = d3.axisLeft<string>(yScale).tickFormat((month: string) => {
      const date = new Date(0);
      date.setUTCMonth(parseInt(month));
      const format = d3.utcFormat("%B");
      return format(date); 
    });
    svg.append("g")
        .attr("id", "x-axis")
        .attr("transform", `translate(0, ${h})`)
        .call(xAxis);
    
    svg.append("g")
        .attr("id", "y-axis")
        .call(yAxis);
    
    var myColor = d3
      .scaleThreshold<number, string>()
      .range(colors)
      .domain(
        ((min: number, max: number, count: number) => {
          let array = [];
          let step = (max - min) / count;
          let base = min;
          for(let i = 1; i < count; i++) {
            array.push(base + i * step);
          }
          return array;
        })(minTemp, maxTemp, colors.length)
      )
    
    svg.selectAll("rect")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", (d: DataInterface) => xScale(d.year.toString())!)
        .attr("y", (d: DataInterface) => yScale(d.month.toString())!)
        .style("fill", (d: DataInterface) => myColor(baseTemperature + d.variance))
        .attr("width", xScale.bandwidth() )
        .attr("height", yScale.bandwidth() )
        .attr("data-year", (d: DataInterface) => d.year.toString())
        .attr("data-month", (d: DataInterface) => d.month.toString())
        .attr("data-temp", (d: DataInterface) => baseTemperature + d.month)
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip);

        const tooltip = d3.select("#tooltip");
        function showTooltip(event: MouseEvent, d : DataInterface) {
          const date = new Date(0);
          date.setUTCMonth(d.month);
          tooltip.style("display", "block")
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 30) + "px")
                  .attr("data-year", d.year.toString())
                  .html(`${d.year} - ${d3.utcFormat("%B")(date)}
                        <br>${(baseTemperature + d.variance).toFixed(1)}℃
                        <br>${d.variance.toFixed(1)}℃`)
        }
        function hideTooltip() {
          tooltip.style("display", "none")
        }
      //legend
      const legendW = 400;
      const legendH = 300 / colors.length;
      const legendXScale = d3.scaleLinear<number, number>()
                              .domain([minTemp, maxTemp])
                              .range([0, legendW]);
      console.log(myColor.domain());
      const legendXAxis = d3.axisBottom(legendXScale)
                            .tickValues(myColor.domain())
                            .tickFormat(d3.format('.1f'));
      
      const legend = svg.append('g')
                        .attr('id', 'legend')
                        .attr('transform', `translate(0, ${margin.top + h + margin.bottom - 3 * legendH})`);
      legend.selectAll("rect")
            .data(myColor.range().map((color: string) => {
              const d = myColor.invertExtent(color);
              if(d[0] === null) {
                d[0] = legendXScale.domain()[0];
              }
              if(d[1] === null) {
                d[1] = legendXScale.domain()[1];
              }
              return d
            }))
            .enter()
            .append('rect')
            .style('fill', (d) => myColor(d[0]!))
            .attr('class', 'legend-cell')
            .attr('x', d => legendXScale(d[0]!))
            .attr('y', 0)
            .attr('width', (d) => legendXScale(d[1]!) - legendXScale(d[0]!))
            .attr('height', legendH);
            
      legend.append('g')
            .attr('transform', `translate(0, ${legendH})`)
            .call(legendXAxis);

  })
  .catch(error => console.error(error));