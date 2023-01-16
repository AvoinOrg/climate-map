const ChartComponent = (props) => {
  const canvasRef: React.MutableRefObject<HTMLCanvasElement> = useRef(null)
  const [chart, setChart] = useState(null)

  const { chartOptions, chartUpdateFunction } = props

  const componentIsMounted = useRef(true)
  useEffect(() => {
    return () => {
      componentIsMounted.current = false
    }
  }, [])

  useEffect(() => {
    const chartRef = canvasRef.current.getContext('2d')
    const chart2 = chart || new Chart(chartRef, chartOptions)
    if (chart !== chart2) setChart(chart2)
    if (chartUpdateFunction) chartUpdateFunction(chart2)
    // We only need to destroy the instance when unmounting the component:
    if (!componentIsMounted.current) return chart2.destroy
  }, [canvasRef, chart, chartOptions, chartUpdateFunction, componentIsMounted])

  const classes = { graphContainer: 'a' }
  return (
    <div className={classes.graphContainer}>
      <canvas id="myChart" ref={canvasRef} />
    </div>
  )
}
