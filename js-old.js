const svgWidth = 900;
const svgHeight = 550;
const margin = { top: 20, right: 100, bottom: 40, left: 60 };

const svg = d3.select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto");


const xAxisGroup = svg.append("g")
  .attr("transform", `translate(0, ${svgHeight - margin.bottom})`);

const yAxisGroup = svg.append("g")
  .attr("transform", `translate(${margin.left}, 0)`);

const tooltip = d3.select("#tooltip");

// Legend container
const legendGroup = svg.append("g")
  .attr("transform", `translate(${svgWidth - 70}, ${margin.top + 50})`);

const importantSeeds = new Set([
  18176, 27297, 30893, 13161, 27675, 11586, 27729, 21191, 22889, 43269,
  26845, 2691, 40625, 17720, 41783, 16131, 36350, 33249, 24963, 5850,
  1856, 20093, 23949, 1439, 17878, 19574, 13940, 30155, 32162, 8631,
  2460, 17119, 30066, 9699, 23125, 32397, 13892, 4087, 25574, 40371, 18961
]);

d3.csv("assets/data_for_adi3.csv", d3.autoType).then(data => {
  data.forEach(d => {
    d.avg_V1_V2 = (d.V1 + d.V2) / 2;
    d.avg_V1_V3 = (d.V1 + d.V3) / 2;
    d.avg_V2_V3 = (d.V2 + d.V3) / 2;
    d.avg_V1_V2_V3 = (d.V1 + d.V2 + d.V3) / 3;
  });

  let currentX = document.getElementById("x-select").value;

  function renderChart(xVar) {
    const yVar = "total_gros_margin";

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d[xVar])).nice()
      .range([margin.left, svgWidth - margin.right - 40]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yVar])).nice()
      .range([svgHeight - margin.bottom, margin.top]);

    const color = d3.scaleSequential(d3.interpolateGreens)
      .domain(d3.extent(data, d => d[yVar]));

    // Background dots
    const allDots = svg.selectAll(".dot").data(data, d => d.seed);

  allDots.join(
  enter => enter.append("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d[xVar]))
    .attr("cy", d => y(d[yVar]))
    .attr("r", 3)
    .attr("fill", d => color(d[yVar]))
    .attr("opacity", 0.3),
  update => update
    .attr("cx", d => x(d[xVar]))
    .attr("cy", d => y(d[yVar]))
    .attr("fill", d => color(d[yVar]))
    .attr("r", 3)
);


    // Highlighted seeds
    const importantData = data.filter(d => importantSeeds.has(d.seed));

    const highlights = svg.selectAll(".highlight").data(importantData, d => d.seed);

    highlights.join(
      enter => enter.append("circle")
        .attr("class", "highlight seed")
        .attr("cx", d => x(d[xVar]))
        .attr("cy", d => y(d[yVar]))
        .attr("r", 0)
        .attr("fill", d => color(d[yVar]))
        .transition()
        .duration(800)
        .attr("r", 4),
      update => update
        .transition()
        .duration(500)
        .attr("cx", d => x(d[xVar]))
        .attr("cy", d => y(d[yVar]))
        .attr("fill", d => color(d[yVar]))
        .attr("r", 4)
    )
    .on("mouseover", function (event, d) {
      tooltip
        .classed("hidden", false)
        .html(`
          <strong>Seed:</strong> ${d.seed}<br/>
          <strong>${xVar}:</strong> ${d[xVar]?.toFixed(3)}<br/>
          <strong>Gross Margin:</strong> €${d[yVar]?.toLocaleString()}<br/>
          <hr style="margin:4px 0;">
          <strong>Edge (m):</strong> ${d.edge_out}<br/>
          <strong>Forest Cover:</strong> ${(d.forest_cover * 100).toFixed(1)}%<br/>
          <strong>Grassland Cover:</strong> ${(d.grassland_cover * 100).toFixed(1)}%<br/>
          <strong>Arable Cover:</strong> ${(d.arable_cover * 100).toFixed(1)}%<br/>
          <strong>Mean Field Area:</strong> ${d.area_mean?.toFixed(2)} ha
        `)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");

        d3.select("#selected-info").html(`
          <strong>Seed:</strong> ${d.seed}<br/>
          <strong>${xVar}:</strong> ${d[xVar]?.toFixed(3)}<br/>
          <strong>Gross Margin:</strong> €${d[yVar]?.toLocaleString()}<br/>
          <hr style="margin:6px 0;">
          <strong>Edge (m):</strong> ${d.edge_out}<br/>
          <strong>Forest Cover:</strong> ${(d.forest_cover * 100).toFixed(1)}%<br/>
          <strong>Grassland Cover:</strong> ${(d.grassland_cover * 100).toFixed(1)}%<br/>
          <strong>Arable Cover:</strong> ${(d.arable_cover * 100).toFixed(1)}%<br/>
          <strong>Mean Field Area:</strong> ${d.area_mean?.toFixed(2)} ha
        `);
    })
    .on("mouseout", () => tooltip.classed("hidden", true));

    // Axes
    xAxisGroup.transition().duration(500).call(d3.axisBottom(x));
    yAxisGroup.transition().duration(500).call(d3.axisLeft(y));

    // Color legend
    legendGroup.selectAll("*").remove(); // Clear previous legend

    const legendHeight = 120;
    const legendScale = d3.scaleLinear()
      .domain(color.domain())
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(6)
      .tickFormat(d3.format("$.2s"));

    const defs = svg.append("defs");
    const gradientId = "legend-gradient";

    const linearGradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%").attr("y1", "100%")
      .attr("x2", "0%").attr("y2", "0%");

    const stops = d3.range(0, 1.01, 0.1).map(t => ({
      offset: `${t * 100}%`,
      color: color(color.domain()[0] + t * (color.domain()[1] - color.domain()[0]))
    }));

    linearGradient.selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    legendGroup.append("rect")
      .attr("width", 15)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    legendGroup.append("g")
      .attr("transform", `translate(15, 0)`)
      .call(legendAxis);

    legendGroup.append("text")
      .attr("x", -10)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .text("Gross Margin (€)");
  }

  renderChart(currentX);

  document.getElementById("x-select").addEventListener("change", e => {
    currentX = e.target.value;
    renderChart(currentX);
  });
});
