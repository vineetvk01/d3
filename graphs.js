



function visualizeBar(values, { barHeight = 40, totalWith = 1000 } = {}) {

  //Validations
  const total = values.data.reduce((acc, d) => {
    return acc + d.value;
  }, 0);
  if (Object.is(total, NaN)) throw new Error('All the [value] in [data] array should be a number');
  if (!(values.type && (values.type === 'percentage' || values.type === 'number'))) throw new Error('Missing parameter [type]. Value should be "percentage" or "number"');
  if (values.type === 'percentage') {
    if (total < 100) throw new Error('The total of data less than 100%. Please check the values.');
    if (total > 100) throw new Error('The total of data more than 100%. Please check the values.');
  }

  const attach = function (selector) {

    let { data, type } = values;
    const totalHeight = 200;

    const occupiedWidth = new Array(data.length);
    occupiedWidth.fill(0);

    const colors = new Proxy(['#a4f6f3', '#8eb7ff', '#c2f7de', '#a4d3ff', '#e5e3a2', '#e1c3f0', '#94d7b9', '#eb9f9f', '#f2dce5', '#cdc5f5'], {
      get: function (colors, index) {
        if (index >= colors.length) {
          index = Math.floor(index % colors.length)
        }
        return Reflect.get(...arguments);
      }
    })

    if (type === 'number') {
      const total = data.reduce((acc, d) => {
        return acc + d.value;
      }, 0);

      updatedData = data.map((d) => {
        const updatedD = { ...d };
        updatedD._value = d.value;
        updatedD.value = Math.round((d.value / total) * 100);
        return updatedD;
      });

      data = [...updatedData];
    }

    //Implementation
    let occupiedBar = 0;
    let mouseOnBar;
    const svg = d3.select(selector)
      .append('svg')
      .attr('height', totalHeight)
      .attr('width', totalWith + 50)

    const group = svg
      .selectAll('g')
      .data(data)
      .enter()
      .append('g');

    group.append('rect')
      .on("mouseover", function () {
        const transform = d3.select(this).attr('transform');
        mouseOnBar = transform.split(',')[0];
        d3.select(this)
          .attr('height', barHeight + 10)
          .attr('transform', () => `${mouseOnBar}, 95) scale(1)`)
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .attr('height', barHeight)
          .attr('transform', `${mouseOnBar}, 100)`)
      })
      .attr('width', d => (totalWith * (d.value / 100)))
      .attr('height', barHeight)
      .attr('stroke', 'white')
      .attr('stroke-width', 0.6)
      .attr('fill', (_, i) => colors[i])
      .attr('transform', (d, i) => {
        const toOccupy = occupiedBar;
        occupiedWidth[i] = toOccupy;
        occupiedBar = occupiedBar + (totalWith * (d.value / 100));
        return `translate(${toOccupy}, 100)`;
      });

    group.append('rect')
      .attr('height', (_, i) => Math.floor(i % 2) === 0 ? 40 : 20)
      .attr('width', 1)
      .attr('fill', (_, i) => colors[i])
      .attr('transform', (d, i) => {
        const xPos = occupiedWidth[i] + (totalWith * (d.value / 100) / 2);
        const yPos = Math.floor(i % 2) === 0 ? 50 : 70
        return `translate(${xPos}, ${yPos})`;
      });

    group.append('text')
      .attr("x", (d, i) => occupiedWidth[i] + (totalWith * (d.value / 100) / 2) - 5)
      .attr("y", (_, i) => Math.floor(i % 2) === 0 ? 40 : 60)
      .attr("font-size", "0.8em")
      .text((d) => d._value ? `${d._value}` : `${d.value}%`);

    let requiredLength = 80 * data.length;
    let startingPoint = (totalWith - requiredLength) / 2;
    if (startingPoint > 0) {
      group.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', (_, i) => colors[i])
        .attr('transform', (_, i) => {
          const xPos = startingPoint + i * (80);
          const yPos = 180;
          return `translate(${xPos}, ${yPos})`;
        });

      group.append('text')
        .attr("x", (_, i) => startingPoint + i * (80) + 20)
        .attr("y", 190)
        .attr("font-size", "0.8em")
        .text((d) => `${d.tag}`);
    } else {
      console.error(`Increase [totalWidth] more than ${requiredLength} for displaying tags`)
    }
  }

  return Object.freeze({ attach });
}

function visualizeDonut(values, startPeriod, endPeriod, {
  color = '#eb9f9f',
  backgroundColor = "#fff"
} = {}) {

  //Internal Utils
  function m(n, d) {
    x = ('' + n).length, p = Math.pow, d = p(10, d)
    x -= x % 3
    return Math.round(n * d / p(10, x)) / d + " kMGTPE"[x / 3]
  }

  function htmlGains(gain) {
    if (typeof gain !== "number") throw new Error('Error while calculating gain');

    if (gain > 0) {
      return { unicode: '&#8593;', color: 'green' }
    } else if (gain < 0) {
      return { unicode: '&#8595;', color: 'red' }
    }

    return { unicode: '-', color: 'blue' };
  }

  let { data, target_of_month, last_month } = values;

  //Validations
  if (typeof target_of_month !== 'number') throw new Error('target_of_month must be a number');
  if (typeof last_month !== 'number') throw new Error('last_month must be a number');
  if (data.length < 1) throw new Error('No data provided in the input');
  if (!data.every((d) => typeof d.value === 'number')) throw new Error('All values in the data must be a number');
  if (data.some((d) => Object.is(Date.parse(d.date), NaN))) throw new Error('All Dates in the data must be a [YYYY-MM-DD] Format');

  const attach = function (selector) {

    const width = 200;
    const height = 220;
    startPeriod = Date.parse(startPeriod);
    endPeriod = Date.parse(endPeriod);

    data = data.filter((d) => {
      const date = Date.parse(d.date);
      return (date >= startPeriod && date <= endPeriod)
    });

    let totalVisits = data.reduce((acc, d) => {
      return acc + d.value;
    }, 0);

    const accomplished = Math.floor((totalVisits / target_of_month) * 100);

    const svg = d3.select(selector)
      .append('svg')
      .attr('height', height)
      .attr('width', width)

    var x = d3.scaleTime()
      .domain([new Date(startPeriod), new Date(endPeriod)])
      .range([20, 180]);

    var y = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.value))
      .range([180, 80]);

    var linearGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", 1)

    linearGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 1);

    linearGradient.append("stop")
      .attr("offset", "70%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.3);

    linearGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", 'white')
      .attr("stop-opacity", 0.2)

    const area = d3.area()
      .curve(d3.curveBasis)
      .x((d) => x(new Date(Date.parse(d.date))))
      .y0(y(0))
      .y1((d) => y(d.value))

    const occupied = svg.append("path")
      .datum(data)
      .attr('stroke', "url(#linear-gradient)")
      .attr('stroke-width', 1)
      .attr('fill', color)
      .attr('fill-opacity', 0.1)
      .attr('d', area);

    occupied.transition()
      .ease(d3.easeSin)
      .duration(500)
      .attr('fill', "url(#linear-gradient)")
      .attr('fill-opacity', 0.7)

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const half_circumference = circumference / 2;

    svg.append('circle')
      .attr('cx', 100)
      .attr('cy', 100)
      .attr('r', 110)
      .attr('fill', 'transparent')
      .attr('stroke', backgroundColor)
      .attr('stroke-width', 50);

    svg.append('circle')
      .attr('cx', 100)
      .attr('cy', 100)
      .attr('r', 90)
      .attr('fill', 'transparent')
      .attr('stroke', '#d3d3d3')
      .attr('stroke-width', 10);

    const right = svg.append('path')
      .attr('stroke-width', 10)
      .attr('stroke', color)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${0}, ${half_circumference}`)
      .attr('fill', 'transparent')
      .attr('d', 'M100,190 a90,90 0 1,0 0,-180');

    right.transition()
      .ease(d3.easeSin)
      .duration(500)
      .attr('stroke-dasharray', `${half_circumference * (accomplished / 100)}, ${half_circumference}`)

    const left = svg.append('path')
      .attr('stroke-width', 10)
      .attr('stroke', color)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${0}, ${half_circumference}`)
      .attr('fill', 'transparent')
      .attr('d', 'M100,190 a90,90 0 0,1 0,-180');

    left.transition()
      .ease(d3.easeSin)
      .duration(500)
      .attr('stroke-dasharray', `${half_circumference * (accomplished / 100)}, ${half_circumference}`)

    svg.append('text')
      .attr("x", 100)
      .attr("y", 100)
      .attr("dy", 10)
      .attr("text-anchor", "middle")
      .attr("font-weight", 700)
      .attr("font-family", 'Roboto')
      .attr("font-size", "2.5em")
      .text(totalVisits < 1000 ? totalVisits : m(totalVisits, 2));

    let gains = (totalVisits - last_month);
    const { unicode, color: _color } = htmlGains(gains);
    gains = Math.abs(gains);

    svg.append('text')
      .attr("x", 100)
      .attr("dx", -30)
      .attr("y", 210)
      .attr("dy", 10)
      .attr('fill', _color)
      .attr("text-anchor", "middle")
      .attr("font-weight", 800)
      .attr("font-family", 'Roboto')
      .attr("font-size", "2em")
      .html(unicode);

    svg.append('text')
      .attr("x", 100)
      .attr("y", 210)
      .attr("dy", 10)
      .attr("text-anchor", "middle")
      .attr("font-weight", 800)
      .attr("font-family", 'Roboto')
      .attr("font-size", "1.2em")
      .html(m(gains, 2));
  }

  return Object.freeze({ attach });
}
