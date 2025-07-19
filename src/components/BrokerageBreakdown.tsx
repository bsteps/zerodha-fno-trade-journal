import { format } from "date-fns"
import { useMemo } from "react"
import { Trade } from "../types/trade"
import { BrokerageCharges, calculatePositions, getBrokerageBreakdown } from "../utils/calculations"
import { InfoTooltip } from "./InfoTooltip"
import { AIRecommendations } from "./AIRecommendations"
import { formatCurrency } from "../utils/formatters"

interface BrokerageBreakdownProps {
  trades: Trade[]
}

export function BrokerageBreakdown({ trades }: BrokerageBreakdownProps) {
  const positions = useMemo(() => calculatePositions(trades), [trades])
  const brokerageData = useMemo(() => getBrokerageBreakdown(positions), [positions])

  const ChargesTable = ({ charges, title }: { charges: BrokerageCharges; title: string }) => (
    <div className='bg-white rounded-lg shadow p-6'>
      <h3 className='text-lg font-semibold text-gray-900 mb-4'>{title}</h3>
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Brokerage:</span>
          <span className='font-mono'>{formatCurrency(charges.brokerage)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>STT/CTT:</span>
          <span className='font-mono'>{formatCurrency(charges.stt)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Transaction Charges:</span>
          <span className='font-mono'>{formatCurrency(charges.transactionCharges)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>SEBI Charges:</span>
          <span className='font-mono'>{formatCurrency(charges.sebiCharges)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Stamp Charges:</span>
          <span className='font-mono'>{formatCurrency(charges.stampCharges)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>
            IPFT Charges:
            <InfoTooltip id="ipft-charges" content="Investor Protection Fund Trust charges levied by NSE for investor protection" />
          </span>
          <span className='font-mono'>{formatCurrency(charges.ipftCharges)}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>GST (18%):</span>
          <span className='font-mono'>{formatCurrency(charges.gst)}</span>
        </div>
        <div className='border-t pt-2 mt-2'>
          <div className='flex justify-between font-semibold'>
            <span>Total Charges:</span>
            <span className='font-mono text-red-600'>{formatCurrency(charges.totalCharges)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-gray-900'>Brokerage Breakdown</h2>
        <div className='text-sm text-gray-500'>Based on your broker's fee structure</div>
      </div>

      {/* Total Charges Summary */}
      <ChargesTable charges={brokerageData.totalCharges} title='Total Charges Summary' />

      {/* Merged Orders Summary */}
      <div className='bg-white rounded-lg shadow p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Order Summary</h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-blue-600'>{brokerageData.positions.length}</div>
            <div className='text-sm text-gray-600'>Total Positions</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>{brokerageData.positions.filter((t) => t.positionType === "long").length}</div>
            <div className='text-sm text-gray-600'>Long Positions</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-red-600'>{brokerageData.positions.filter((t) => t.positionType === "short").length}</div>
            <div className='text-sm text-gray-600'>Short Positions</div>
          </div>
        </div>
      </div>

      {/* Daily Charges Breakdown */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <div className='px-6 py-4 border-b border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900'>Daily Charges Breakdown</h3>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Date</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Brokerage</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>STT/CTT</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Transaction</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>IPFT</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>GST</th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Total</th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {brokerageData.dailyCharges.map(({ date, charges }) => (
                <tr key={date} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{format(new Date(date), "dd MMM yyyy")}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono'>{formatCurrency(charges.brokerage)}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono'>{formatCurrency(charges.stt)}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono'>{formatCurrency(charges.transactionCharges)}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono'>{formatCurrency(charges.ipftCharges)}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono'>{formatCurrency(charges.gst)}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right font-mono'>{formatCurrency(charges.totalCharges)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          ...brokerageData,
          trades: [],
        }}
        pageContext='brokerage'
        pageTitle='Brokerage Analysis'
        dataDescription='cost analysis and fee optimization data'
      />
    </div>
  )
}
