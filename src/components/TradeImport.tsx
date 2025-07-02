import { AlertCircle, CheckCircle, FileText, Upload, X } from "lucide-react"
import React, { useCallback, useState } from "react"
import { Trade } from "../types/trade"
import { mergeTradesByOrderId } from "../utils/calculations"
import { parseCsvFile, ParseResult } from "../utils/csvParser"

interface TradeImportProps {
  onTradesImported: (trades: Trade[]) => void
  onClose?: () => void
}

export function TradeImport({ onTradesImported, onClose }: TradeImportProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((file) => file.name.toLowerCase().endsWith(".csv"))

    if (csvFile) {
      setSelectedFile(csvFile)
      processFile(csvFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      processFile(file)
    }
  }, [])

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setParseResult(null)

    try {
      const result = await parseCsvFile(file)
      setParseResult({
        ...result,
        trades: mergeTradesByOrderId(result.trades),
      })
    } catch (error) {
      setParseResult({
        trades: [],
        errors: [`Failed to process file: ${error instanceof Error ? error.message : "Unknown error"}`],
        totalRows: 0,
        validRows: 0,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (parseResult && parseResult.trades.length > 0) {
      onTradesImported(parseResult.trades)
      if (onClose) onClose()
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setParseResult(null)
    setIsProcessing(false)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden'>
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-semibold text-gray-900'>Import Trade Data</h2>
          {onClose && (
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
              <X size={24} />
            </button>
          )}
        </div>

        <div className='p-6'>
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className='mx-auto h-12 w-12 text-gray-400 mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>Upload your trade CSV file</h3>
              <p className='text-gray-600 mb-4'>Drag and drop your CSV file here, or click to select</p>
              <input type='file' accept='.csv' onChange={handleFileSelect} className='hidden' id='file-upload' />
              <label htmlFor='file-upload' className='btn-primary cursor-pointer inline-block'>
                Select CSV File
              </label>
              <div className='mt-4 text-sm text-gray-500'>
                <p>Expected format: symbol, trade_date, trade_type, quantity, price, etc.</p>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center space-x-3 p-4 bg-gray-50 rounded-lg'>
                <FileText className='h-8 w-8 text-blue-600' />
                <div className='flex-1'>
                  <h4 className='font-medium text-gray-900'>{selectedFile.name}</h4>
                  <p className='text-sm text-gray-600'>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={handleReset} className='text-gray-400 hover:text-gray-600'>
                  <X size={20} />
                </button>
              </div>

              {isProcessing && (
                <div className='flex items-center justify-center p-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                  <span className='ml-3 text-gray-600'>Processing file...</span>
                </div>
              )}

              {parseResult && (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-green-50 p-4 rounded-lg'>
                      <div className='flex items-center'>
                        <CheckCircle className='h-5 w-5 text-green-600 mr-2' />
                        <span className='font-medium text-green-900'>Valid Trades</span>
                      </div>
                      <p className='text-2xl font-bold text-green-600 mt-1'>{parseResult.validRows}</p>
                    </div>
                    <div className='bg-blue-50 p-4 rounded-lg'>
                      <div className='flex items-center'>
                        <FileText className='h-5 w-5 text-blue-600 mr-2' />
                        <span className='font-medium text-blue-900'>Total Rows</span>
                      </div>
                      <p className='text-2xl font-bold text-blue-600 mt-1'>{parseResult.totalRows}</p>
                    </div>
                  </div>

                  {parseResult.errors.length > 0 && (
                    <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                      <div className='flex items-center mb-2'>
                        <AlertCircle className='h-5 w-5 text-red-600 mr-2' />
                        <span className='font-medium text-red-900'>{parseResult.errors.length} Error(s) Found</span>
                      </div>
                      <div className='max-h-32 overflow-y-auto'>
                        {parseResult.errors.slice(0, 10).map((error, index) => (
                          <p key={index} className='text-sm text-red-700 mb-1'>
                            {error}
                          </p>
                        ))}
                        {parseResult.errors.length > 10 && <p className='text-sm text-red-600 font-medium'>... and {parseResult.errors.length - 10} more errors</p>}
                      </div>
                    </div>
                  )}

                  <div className='flex space-x-3'>
                    <button onClick={handleImport} disabled={parseResult.validRows === 0} className='btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed'>
                      Import {parseResult.validRows} Trades
                    </button>
                    <button onClick={handleReset} className='btn-secondary'>
                      Choose Different File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
