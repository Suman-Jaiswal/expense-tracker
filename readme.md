# 💰 Expense Tracker

A modern expense tracking application that automatically syncs with Gmail to fetch credit card statements, parse transactions, and calculate outstanding balances in real-time.

## 🌟 Features

- **Automatic Statement Sync**: Fetch credit card statements directly from Gmail
- **PDF Parsing**: Extract transaction data from encrypted PDF statements (ICICI, Axis, SBI)
- **Real-time Tracking**: Monitor credit card outstanding balances and transactions
- **Multi-Bank Support**: Support for multiple credit cards across different banks
- **Modern UI**: Clean, responsive interface built with React 19 and Ant Design
- **Firebase Integration**: Secure data storage with Firestore
- **Google OAuth**: Secure authentication using Google accounts

## 🏗️ Architecture

```
expense-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React Context (state management)
│   │   ├── utils/         # Utility functions
│   │   ├── api/          # API integration layer
│   │   ├── firebase.js   # Firebase configuration
│   │   └── App.js        # Main application
│   └── package.json
│
├── server/                # Express backend
│   ├── src/
│   │   ├── auth/         # Google OAuth authentication
│   │   ├── repository/   # Database layer (Firestore)
│   │   ├── services/     # Business logic
│   │   │   ├── creditCards/       # Statement fetching & processing
│   │   │   ├── bankAccounts/      # Bank account management
│   │   │   └── transactions/      # PDF transaction extraction
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── utils/        # PDF parsing utilities
│   │   └── config.js     # Configuration
│   ├── server.js         # Express server
│   └── package.json
│
├── docs/                  # 📚 Documentation
│   ├── CONTRIBUTING.md
│   ├── FEATURE_SUGGESTIONS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── MODERNIZATION_SUMMARY.md
│   ├── PROJECT_CLEANUP_SUMMARY.md
│   ├── QUICK_START_SYNC.md
│   ├── TRANSACTION_EXTRACTION_GUIDE.md
│   └── TRANSACTION_EXTRACTION_INTEGRATION.md
│
├── .github/               # GitHub Actions CI/CD
├── docker-compose.yml     # Docker orchestration
└── README.md
```

> **📚 More Documentation**: Check the [`docs/`](./docs) folder for detailed guides on setup, features, and development.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Firebase account and project
- Google Cloud Platform account (for Gmail/Drive API)
- Credit card statement emails in Gmail

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd expense-tracker
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure Environment Variables**

   Create `.env` files:

   **Server** (`server/.env`):
   ```env
   PORT=4000
   NODE_ENV=development
   
   # Firebase Configuration
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   
   # PDF Passwords (for encrypted statements)
   AXIS_PDF_PASSWORD=your_password
   ICICI_PDF_PASSWORD=your_password
   SBI_PDF_PASSWORD=your_password
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:4040/oauth2callback
   ```

   **Client** (`client/.env`):
   ```env
   REACT_APP_API_URL=http://localhost:4000
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Setup Google Cloud Credentials**
   
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Gmail API and Drive API
   - Create OAuth 2.0 credentials
   - Download `credentials.json` and place it in the `server/` directory

5. **Firebase Setup**
   
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database
   - Add your app to Firebase and get configuration
   - Update environment variables

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:4000`

2. **Start the frontend** (in a new terminal)
   ```bash
   cd client
   npm start
   ```
   The app will open at `http://localhost:3000`

3. **First-time OAuth Setup**
   - Visit `http://localhost:4000/sync-cards` to authenticate with Google
   - Grant permissions for Gmail and Drive access
   - Token will be saved for future use

## 📖 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/sync-statements` | Fetch all statements from Gmail |
| GET | `/sync-cards` | Initialize/sync credit card data |
| GET | `/sync-tnxs` | Sync transactions |
| POST | `/transactions` | Add multiple transactions |
| DELETE | `/delete-statements` | Delete all statements |
| DELETE | `/delete-cards` | Delete all cards |
| DELETE | `/delete-tnxs` | Delete all transactions |

### Data Models

**Card**
```javascript
{
  id: "BANK_XXXXXX",
  resourceIdentifier: "card_BANK_XXXXXX",
  metaData: {
    cardName: "Card Name",
    bankName: "BANK",
    cardType: "credit",
    cardNumber: "XXXXXXXXXXXX",
    cardExpiry: "MM/YY",
    cardCVV: "XXX"
  },
  billingDate: "10",
  dueDate: "30",
  creditLimit: "300000",
  availableCredit: "300000",
  outstanding: "0"
}
```

**Transaction**
```javascript
{
  id: "unique_id",
  resourceIdentifier: "card_BANK_XXXXXX",
  date: "2024-01-15",
  description: "Transaction description",
  amount: "1000",
  type: "debit" | "credit"
}
```

## 🛠️ Development

### Available Scripts

**Server:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Client:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Code Style

- ESLint configuration for consistent code style
- Prettier for code formatting
- Component-based architecture
- Functional components with hooks

## 🐳 Docker Deployment

Build and run with Docker:

```bash
# Build server image
cd server
docker build -t expense-tracker-server .

# Build client image
cd client
docker build -t expense-tracker-client .

# Run with docker-compose (coming soon)
docker-compose up
```

## 🔒 Security Best Practices

- ✅ Environment variables for all sensitive data
- ✅ No hardcoded passwords or API keys
- ✅ Firebase security rules
- ✅ CORS configuration
- ✅ OAuth 2.0 for authentication
- ✅ HTTPS in production

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📝 Supported Banks

| Bank | Status | Statement Format |
|------|--------|------------------|
| ICICI | ✅ Active | Encrypted PDF |
| Axis Bank | ✅ Active | Encrypted PDF |
| SBI Card | ⚠️ Disabled | Encrypted PDF |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Ant Design](https://ant.design/) - UI Components
- [Firebase](https://firebase.google.com/) - Backend services
- [Google APIs](https://developers.google.com/) - Gmail & Drive integration
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF parsing

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

## 🗺️ Roadmap

- [ ] TypeScript migration
- [ ] Advanced analytics dashboard
- [ ] Budget planning features
- [ ] Mobile app (React Native)
- [ ] Automated categorization with ML
- [ ] Multi-currency support
- [ ] Bank statement OCR improvements
- [ ] Expense splitting features
- [ ] Export to Excel/PDF
- [ ] Recurring transaction detection

---

Made with ❤️ for better expense tracking
