# Bright Support Chatbot

A customer support chatbot application that helps users with order tracking, cancellations, billing issues, product recommendations, and onboarding feedback.

## Features

- **Order Status Tracking** - Check order status and tracking information
- **Cancellation & Refunds** - Request cancellations or check refund status
- **Product Recommendations** - Get personalized upsell suggestions
- **Billing Support** - Handle account and payment issues
- **Onboarding Feedback** - Collect structured feedback from new customers
- **Customer Verification** - Secure identity verification before accessing account data
- **Human Escalation** - Automatic escalation when verification fails

## Live Demo

Visit the live application at: [https://amiracool.github.io/chatbot/](https://amiracool.github.io/chatbot/)

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **API**: OpenAI GPT-4o-mini for natural language processing
- **Data Source**: DummyJSON for mock customer data
- **Hosting**: GitHub Pages

## Getting Started

### Prerequisites

- A modern web browser
- OpenAI API key (optional, for AI-enhanced features)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/amiracool/chatbot.git
   cd chatbot
   ```

2. Open `index.html` in your browser:
   ```bash
   # On Windows
   start index.html

   # On Mac
   open index.html

   # On Linux
   xdg-open index.html
   ```

3. (Optional) Enter your OpenAI API key when prompted to enable AI features

### API Key Setup

The chatbot can work with or without an OpenAI API key:

- **With API key**: Enhanced natural language understanding and summarization features
- **Without API key**: Basic rule-based flow handling still works

#### How to get an OpenAI API key:

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Enter the key when prompted by the chatbot

**Security Note**: Your API key is stored locally in your browser's localStorage and is never sent to any server except OpenAI's API.

## Project Structure

```
chatbot/
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── app.js              # Core chatbot logic and API integration
└── README.md           # Project documentation
```

## How It Works

1. **Flow Detection**: User input is analyzed to determine intent (order status, cancellation, etc.)
2. **Verification**: Users must verify their identity with name, email, and address
3. **Data Matching**: Customer information is matched against order database
4. **Response Generation**: Appropriate information is retrieved and presented
5. **Escalation**: Failed verification triggers human agent escalation

## Configuration

### Environment Variables

For production deployments, you can set environment variables:

```javascript
window.__ENV__ = {
  OPENAI_API_KEY: 'your-api-key-here',
  OPENAI_MODEL: 'gpt-4o-mini' // or any other OpenAI model
};
```

### Data Endpoints

The app uses these endpoints (configurable in `app.js`):

- Customer Data: `https://dummyjson.com/c/a66d-ab89-4f6b-9289`
- Product Catalog: `https://dummyjson.com/products?limit=3`

## Deployment

### GitHub Pages

This project is already set up for GitHub Pages deployment:

1. Push your changes to the `main` branch
2. GitHub Pages will automatically build and deploy
3. Access your site at `https://yourusername.github.io/chatbot/`

### Other Hosting Options

You can also deploy to:
- **Netlify**: Drag and drop the folder or connect your GitHub repo
- **Vercel**: Import your GitHub repository
- **Any Static Host**: Upload the HTML, CSS, and JS files

## Customization

### Modify Support Flows

Edit the flow detection logic in `app.js`:

```javascript
function detectFlowFromText(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("your-keyword")) return "your_custom_flow";
  // Add more flows...
}
```

### Change Styling

Modify `styles.css` to customize colors, fonts, and layout.

### Update Branding

Change the title in `index.html`:

```html
<h1>Your Company Name</h1>
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Contact

Created by [@amiracool](https://github.com/amiracool)

## Acknowledgments

- OpenAI for GPT API
- DummyJSON for mock data endpoints
- GitHub Pages for hosting
