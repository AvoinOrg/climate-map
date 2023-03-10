import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export const FinlandForestsChart = ({ chartOptions }: any) => {
  return (
    <div>
      <Bar options={chartOptions.options} data={chartOptions.data} />
    </div>
  )
}
