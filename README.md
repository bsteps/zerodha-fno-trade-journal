# 📊 Zerodha F&O Trading Journal & Analytics

A comprehensive, open-source trading journal and analytics platform specifically designed for **Zerodha F&O (Futures & Options)** traders. Transform your raw trading data into actionable insights with advanced analytics, risk management tools, and psychological pattern analysis.

![Trading Journal Dashboard](https://img.shields.io/badge/Status-Open%20Source-brightgreen)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-blue)

## ✨ Features

### 📈 **Core Analytics**
- **P&L Dashboard**: Daily, monthly, and overall performance tracking
- **Position Tracker**: Real-time position monitoring with realized/unrealized P&L
- **Order Analysis**: Detailed order execution analysis with merged trade views
- **Performance Charts**: Visual representation of trading performance over time

### 🎯 **Advanced Analytics**
- **Risk Management**: Drawdown analysis, risk-reward ratios, position sizing
- **Market Timing**: Hourly trading patterns, entry/exit timing analysis
- **Strategy Analysis**: Win rate analysis, profit factor calculations
- **Psychological Patterns**: Revenge trading detection, emotional trading analysis

### 💼 **Portfolio Management**
- **Portfolio Analytics**: Sector exposure, capital utilization analysis
- **Comparative Analysis**: Benchmark comparisons and performance metrics
- **Brokerage Breakdown**: Detailed cost analysis with Zerodha's fee structure

### 📱 **User Experience**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Intuitive Navigation**: Organized tabs with grouped analytics sections
- **Data Persistence**: Local storage for your trading data
- **CSV Import**: Easy data import from Zerodha console

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (version 18.x or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zerodha-fno-trading-journal.git
   cd zerodha-fno-trading-journal
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or if you prefer yarn
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or with yarn
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to access the application.

## 📥 How to Download & Import Your Zerodha Trading Data

### Step 1: Access Zerodha Console
1. Log in to your [Zerodha Console](https://console.zerodha.com/)
2. Navigate to **Reports** → **Tradebook**

### Step 2: Configure Export Settings
1. **Select Segment**: Choose **"Future & Options"** from the dropdown
2. **Set Date Range**:
   - Click on the date picker
   - Select your desired start and end dates
   - For comprehensive analysis, we recommend downloading at least 3-6 months of data
3. **File Format**: Ensure **CSV** format is selected

### Step 3: Download the Data
1. Click the **"Download"** button
2. The CSV file will be downloaded to your default downloads folder
3. The file will be named something like `tradebook-FO-YYYY-MM-DD.csv`

### Step 4: Import into the Application
1. Open the trading journal application in your browser
2. Click the **"Import CSV"** button in the top-right corner
3. Select the downloaded CSV file from your computer
4. The application will automatically:
   - Parse and validate your trading data
   - Merge multiple executions by Order ID
   - Calculate P&L, brokerage, and other metrics
   - Display comprehensive analytics

### 📋 Supported Data Format

The application expects CSV files with the following columns:
- `symbol` - Trading symbol (e.g., NIFTY2560524750PE)
- `trade_date` - Date of trade execution
- `trade_type` - 'buy' or 'sell'
- `quantity` - Number of shares/contracts
- `price` - Execution price
- `order_id` - Unique order identifier
- `order_execution_time` - Timestamp of execution
- `expiry_date` - Contract expiry date
- And other standard Zerodha tradebook fields

## 🎛️ Application Sections

### 📊 **Dashboard**
- Overview of your trading performance
- Key metrics and statistics
- Recent trading activity

### 📈 **Positions**
- Active and closed positions
- Realized and unrealized P&L
- Position-wise performance analysis

### 📋 **Orders**
- Detailed order execution history
- Merged view of multiple executions
- Sortable and filterable data table

### 📉 **Analytics Sections**

#### Performance Charts
- Daily P&L trends
- Win rate analysis
- Instrument type distribution

#### Risk Analysis
- Maximum drawdown analysis
- Risk-reward ratios
- Position sizing analysis

#### Advanced Metrics
- Profit factor calculations
- Sharpe ratio analysis
- Advanced statistical metrics

#### Market Timing
- Hourly trading patterns
- Entry and exit timing analysis
- Market session performance

#### Strategy Analysis
- Trading strategy effectiveness
- Pattern recognition
- Strategy comparison tools

#### Psychology
- Revenge trading detection
- Emotional trading patterns
- Behavioral analysis

#### Portfolio Analytics
- Sector exposure analysis
- Capital utilization metrics
- Diversification analysis

#### Comparative Analysis
- Benchmark comparisons
- Peer performance analysis
- Market correlation studies

#### Brokerage Breakdown
- Detailed cost analysis
- Fee structure breakdown
- Cost optimization insights

## 🛠️ Technical Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts library
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Data Processing**: Custom utilities for trade analysis

## 🤝 Contributing

We welcome contributions from the trading community! Here's how you can help:

### Ways to Contribute
- 🐛 **Bug Reports**: Found an issue? Please report it!
- 💡 **Feature Requests**: Have ideas for new analytics features?
- 📝 **Documentation**: Help improve our guides and documentation
- 💻 **Code Contributions**: Submit pull requests for new features or fixes

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and analytical purposes only. It is not financial advice. Always consult with qualified financial advisors before making trading decisions. Past performance does not guarantee future results.

## 🙏 Acknowledgments

- **Zerodha** for providing comprehensive trading data exports
- **React Community** for the excellent ecosystem
- **Trading Community** for feedback and feature suggestions

## 📞 Support

If you encounter any issues or have questions:

1. **Check the Issues**: Look through existing [GitHub Issues](https://github.com/yourusername/zerodha-fno-trading-journal/issues)
2. **Create New Issue**: If your problem isn't covered, create a new issue
3. **Community Discussion**: Join our discussions for general questions

## 🔧 Troubleshooting

### Common Issues

**CSV Import Fails**
- Ensure you're downloading the correct "Future & Options" segment from Zerodha
- Check that the CSV file isn't corrupted or empty
- Verify the date range includes actual trading data

**Application Won't Start**
- Make sure Node.js version is 18.x or higher
- Delete `node_modules` folder and run `npm install` again
- Check for any error messages in the terminal

**Charts Not Displaying**
- Ensure you have imported trading data
- Check browser console for any JavaScript errors
- Try refreshing the page

**Performance Issues**
- Large datasets (>10,000 trades) may take time to process
- Consider filtering data by date range for better performance
- Clear browser cache if the application feels slow

## 🚀 Deployment

### Build for Production

```bash
npm run build
# or
yarn build
```

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Vercel will automatically build and deploy your application

### Deploy to Netlify

1. Build the project: `npm run build`
2. Upload the `dist` folder to [Netlify](https://netlify.com)
3. Configure redirects for single-page application

## 📊 Sample Data

For testing purposes, a sample CSV file is included in the repository (`sample-trades.csv`). You can use this to explore the application's features before importing your own data.

---

**Happy Trading! 📈**

*Made with ❤️ for the Indian F&O trading community*

---

### 🌟 Star this repository if you find it helpful!

**Contribute to make it even better for the trading community** 🚀
