# Contributing to Expense Tracker

Thank you for your interest in contributing to Expense Tracker! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## 📜 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Git
- Firebase account
- Google Cloud Platform account

### Setup Development Environment

1. **Fork the repository**

   ```bash
   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker
   ```

2. **Install dependencies**

   ```bash
   # Server
   cd server
   npm install

   # Client
   cd ../client
   npm install
   ```

3. **Set up environment variables**

   - Copy `.env.example` to `.env` in both `client/` and `server/` directories
   - Fill in your credentials

4. **Run the development servers**

   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev

   # Terminal 2 - Client
   cd client
   npm start
   ```

## 💻 Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write clean, readable code
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**

   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**

## 📝 Coding Standards

### JavaScript/JSX

- Use ES6+ features
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks in React
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### File Structure

```
component/
├── ComponentName.jsx       # Component file
├── ComponentName.test.js   # Tests
└── index.js               # Export file
```

### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.jsx`)
- **Files**: camelCase or kebab-case (e.g., `userService.js`, `api-client.js`)
- **Variables**: camelCase (e.g., `userName`, `isActive`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_URL`, `MAX_RETRIES`)
- **Functions**: camelCase (e.g., `fetchUserData()`)

### Code Formatting

- Use Prettier for code formatting
- Run `npm run format` before committing
- 2 spaces for indentation
- Maximum line length: 80 characters
- Use semicolons
- Use double quotes for strings

## 📦 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(client): add transaction filtering feature

Add filtering by date range and amount for transactions list.
Includes UI components and API integration.

Closes #123
```

```bash
fix(server): resolve PDF parsing error

Fix issue where encrypted PDFs failed to parse due to
incorrect password handling.

Fixes #456
```

## 🔄 Pull Request Process

1. **Ensure your code follows the coding standards**

   - Run linter: `npm run lint`
   - Run tests: `npm test`
   - Check formatting: `npm run format:check`

2. **Update documentation**

   - Update README.md if needed
   - Add JSDoc comments
   - Update API documentation

3. **Write a clear PR description**

   - What changes were made?
   - Why were these changes necessary?
   - How to test the changes?
   - Screenshots (for UI changes)

4. **Link related issues**

   - Reference issue numbers (e.g., "Closes #123")

5. **Request review**

   - Wait for maintainer review
   - Address feedback promptly
   - Make requested changes

6. **Merge**
   - PRs will be squash-merged by maintainers
   - Delete your branch after merge

## 🧪 Testing

### Writing Tests

- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Write component tests for React components
- Aim for >80% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

```javascript
describe("ComponentName", () => {
  it("should render correctly", () => {
    // Test implementation
  });

  it("should handle user interaction", () => {
    // Test implementation
  });
});
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, browser, Node version, etc.
6. **Screenshots**: If applicable
7. **Error Logs**: Console errors or stack traces

## 💡 Feature Requests

When requesting features, please include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Mockups, examples, etc.

## 📞 Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before opening a new one
- Be patient and respectful

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Expense Tracker! 🎉
