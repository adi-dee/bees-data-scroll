// Configuration
const svgWidth = 900;
const svgHeight = 550;
const margin = { top: 20, right: 100, bottom: 40, left: 60 };

// SVG container
const svg = d3.select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto");

  

const xAxisGroup = svg.append("g")
  .attr("transform", `translate(0, ${svgHeight - margin.bottom})`)
  .attr("class", "x-axis");

const yAxisGroup = svg.append("g")
  .attr("transform", `translate(${margin.left}, 0)`)
  .attr("class", "y-axis");

const tooltip = d3.select("#tooltip");
const infoBox = d3.select("#selected-info");

const importantSeeds = new Set([
  "18176", "27297", "30893", "13161", "27675", "11586", "27729", "21191", "22889", "43269",
  "26845", "2691", "40625", "17720", "41783", "16131", "36350", "33249", "24963", "5850",
  "1856", "20093", "23949", "1439", "17878", "19574", "13940", "30155", "32162", "8631",
  "2460", "17119", "30066", "9699", "23125", "32397", "13892", "4087", "25574", "40371", "18961"
]);
// Load and render data
d3.csv("assets/df_for_adi.csv", d3.autoType).then(data => {
  data.forEach(d => {
    d.avg_V1_V2 = (d.V1 + d.V2) / 2;
    d.avg_V1_V3 = (d.V1 + d.V3) / 2;
    d.avg_V2_V3 = (d.V2 + d.V3) / 2;
    d.avg_V1_V2_V3 = (d.V1 + d.V2 + d.V3) / 3;
  });

let currentX = document.getElementById("x-select").value;
let currentColorVar = document.getElementById("color-select").value;
  

  // Render chart
  function renderChart(xVar) {
    const yVar = "total_gros_margin";

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d[xVar])).nice()
      .range([margin.left, svgWidth - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yVar])).nice()
      .range([svgHeight - margin.bottom, margin.top]);

    const middleX = d3.mean(x.domain());
    const middleY = d3.mean(y.domain());

    const distance = d => Math.sqrt(Math.pow(x(d[xVar]) - x(middleX), 2) + Math.pow(y(d[yVar]) - y(middleY), 2));

    const distances = data.map(distance);
    const minDist = d3.min(distances);
    const maxDist = d3.max(distances);

const customInterpolator = d3.interpolateRgbBasis([
   "#ffb0ed",  // dark purple
  "#ffb0ed",  // dark purple
  "#ffffff",  // soft white center
  "#ffdd52",   // soft orange
  "#ff633a"  // soft red
]);
let color;

const interpolators = {
  extra_profit: d3.interpolateOranges,
  area_mean: d3.interpolatePurples,
  edge_out: d3.interpolateGreens,
  grassland_cover: d3.interpolateYlGn,
  forest_cover: d3.interpolateBuPu
};

if (currentColorVar === "compromise") {
  color = d3.scaleDiverging(d3.interpolateRgbBasis([
    "#ffb0ed", "#ffffff", "#ffdd52", "#ff633a"
  ])).domain([maxDist, (maxDist + minDist) / 2, minDist]);
} else {
const extent = d3.extent(data, d => +d[currentColorVar]);
const interpolator = interpolators[currentColorVar] || d3.interpolateYlGnBu;

color = d3.scaleSequential()
  .domain(extent)
  .interpolator(interpolator)
  .clamp(true);

}

    // Axes and gridlines
    const xAxis = d3.axisBottom(x).tickSize(-svgHeight + margin.top + margin.bottom);
    const yAxis = d3.axisLeft(y).tickSize(-svgWidth + margin.left + margin.right);

    xAxisGroup.transition().duration(600).call(xAxis);
    yAxisGroup.transition().duration(600).call(yAxis);

    svg.selectAll(".x-axis .tick line, .y-axis .tick line")
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "2,2");

    svg.selectAll(".x-axis path, .y-axis path")
      .attr("stroke", "#888");

    svg.selectAll(".x-axis text, .y-axis text")
      .attr("fill", "#666")
      .attr("font-size", "11px");

    svg.selectAll(".hexagons").remove();
    svg.selectAll(".highlight").remove();
    svg.selectAll(".color-legend").remove();

    const hexbin = d3.hexbin()
      .x(d => x(d[xVar]))
      .y(d => y(d[yVar]))
      .radius(6)
      .extent([[margin.left, margin.top], [svgWidth - margin.right, svgHeight - margin.bottom]]);

    const bins = hexbin(data);

    function formatPercent(value) {
  if (value > 1) {
    // Already percentage
    return value.toFixed(0); // No decimals
  } else {
    return (value * 100).toFixed(0); // No decimals
  }
}

    const hexGroup = svg.append("g").attr("class", "hexagons");
   const hexPaths = hexGroup
  .selectAll("path")
  .data(bins, d => d[0].seed); // key by seed for smooth updates

hexPaths.join(
  enter => enter.append("path")
    .attr("d", hexbin.hexagon())
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("fill", function (d) {
      const original = currentColorVar === "compromise"
        ? color(distance(d[0]))
        : color(d[0][currentColorVar]);
      d3.select(this).attr("data-original-fill", original);
      return original;
    })
    .attr("fill-opacity", d => importantSeeds.has(String(d[0].seed)) ? 1.0 : 0.85)
    .attr("stroke", d => importantSeeds.has(String(d[0].seed)) ? "#fff" : "white")
    .attr("stroke-width", d => importantSeeds.has(String(d[0].seed)) ? 2 : 0.2)
    .attr("filter", d => importantSeeds.has(String(d[0].seed)) ? "url(#glow)" : null)
    .attr("class", d => importantSeeds.has(String(d[0].seed)) ? "hex-important" : "hex-default")
    .attr("opacity", 0)
    .on("mouseover", function (event, bin) {
      const d = bin[0];
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 1.5);
      tooltip.classed("hidden", false).html(`
        <strong>Seed:</strong> ${d.seed}<br/>
        <strong>${currentX}:</strong> ${d[currentX]?.toFixed(3)}<br/>
        <strong>Gross Margin:</strong> €${d.total_gros_margin?.toLocaleString()}<br/>
        <hr style="border-top: 2px solid #fad2f0;">
        <strong>Edge (m):</strong> ${d.edge_out}<br/>
        <strong>Forest Cover:</strong> ${d.forest_cover.toFixed(0)}%<br/>
        <strong>Grassland Cover:</strong> ${d.grassland_cover.toFixed(0)}%<br/>
        <strong>Arable Cover:</strong> ${d.arable_cover.toFixed(0)}%<br/>
        <strong>Mean Field Area:</strong> ${d.area_mean?.toFixed(2)} ha
      `)
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 28 + "px");
      infoBox.html(tooltip.html());
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none");
      tooltip.classed("hidden", true);
    })
    .transition()
    .delay((d, i) => i * 1) // fast stagger
    .duration(250)
    .attr("opacity", 1),

  update => update.transition()
    .duration(300)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("fill", function (d) {
      const original = currentColorVar === "compromise"
        ? color(distance(d[0]))
        : color(d[0][currentColorVar]);
      return original;
    })
    .attr("opacity", 1),

  exit => exit.transition()
    .duration(150)
    .attr("opacity", 0)
    .remove()
);



    // Dots for all data points

   setTimeout(() => {
  setInterval(() => {
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    svg.selectAll(".hexagons path")
      .transition()
      .delay(function (d) {
        const dx = d.x - centerX;
        const dy = d.y - centerY;
        return Math.sqrt(dx * dx + dy * dy) * 1.2;
      })
      .duration(300)
      .attr("fill", function () {
        const current = d3.select(this);
        return d3.color(current.attr("fill")).darker(0.05);
      })
      .transition()
      .duration(600)
      .attr("fill", function () {
        const current = d3.select(this);
        return d3.color(current.attr("fill")).brighter(0.2);
      })
     .transition()
.duration(600)
.attr("fill", function () {
  return d3.select(this).attr("data-original-fill");
});
  }, 5000);
}, 7000); // Delay to wait until first render finishes






    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
    const filter = defs.select("#glow").empty() ? defs.append("filter").attr("id", "glow") : defs.select("#glow");
    if (filter.selectAll("*").empty()) {
      filter.append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }

  

    // 🎨 Add color legend (top right)
    const legendGroup = svg.append("g")
      .attr("class", "color-legend")
      .attr("transform", `translate(${svgWidth - 120}, ${margin.top})`);

    const legendHeight = 100;
    const legendWidth = 10;

    const legendScale = d3.scaleLinear()
      .domain(color.domain())
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(4);

svg.select("#legend-gradient").remove(); // Remove old gradient

const defsGradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%").attr("y1", "100%")
  .attr("x2", "0%").attr("y2", "0%");

const legendDomain = color.domain();

defsGradient.selectAll("stop")
  .data(d3.range(0, 1.01, 0.1))
  .join("stop")
  .attr("offset", d => `${d * 100}%`)
  .attr("stop-color", d => {
    const val = legendDomain[0] + d * (legendDomain[1] - legendDomain[0]);
    return color(val);
  });

    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendGroup.append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);

    legendGroup.append("text")
      .attr("x", -5)
      .attr("y", -6)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "#444")
.text(() => {
  const labelMap = {
    compromise: "Compromise Center",
    extra_profit: "Extra Profit",
    area_mean: "Mean Field Area",
    edge_out: "Edge Width",
    grassland_cover: "Grassland Cover",
    forest_cover: "Forest Cover"
  };
  return labelMap[currentColorVar] || currentColorVar;
});
  }

  renderChart(currentX);
  document.getElementById("x-select").addEventListener("change", e => {
    currentX = e.target.value;
    renderChart(currentX);

  });

  document.getElementById("color-select").addEventListener("change", e => {
  currentColorVar = e.target.value;
  renderChart(currentX);
});


  
});


// select 

const select = document.getElementById('x-select');
const wrapper = select.parentElement; // should be the div.select-wrapper

// Map option values to Font Awesome icon classes
const iconMap = {
  V1: 'fa-solid fa-people-arrows',        // Queen Bees
  V2: 'fa-solid fa-seedling',              // Pollination
  avg_V1_V2: 'fa-solid fa-leaf',           // F1 + F2 combined icon
  avg_V1_V3: 'fa-solid fa-bug',            // F1 + F3
  avg_V2_V3: 'fa-solid fa-paw',            // F2 + F3
  avg_V1_V2_V3: 'fa-solid fa-globe',       // F1 + F2 + F3
};

function updateSelectIcon() {
  // Remove existing icon if present
  const existingIcon = wrapper.querySelector('.select-icon');
  if (existingIcon) existingIcon.remove();

  const val = select.value;
  const iconClass = iconMap[val];

  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass + ' select-icon';
    wrapper.appendChild(icon);
  }
}

// Initial icon on page load
updateSelectIcon();

// Update icon whenever the select value changes
select.addEventListener('change', updateSelectIcon);
