# Install Markdown Support

Run these commands to add markdown rendering to the chatbot:

```bash
cd client
npm install react-markdown remark-gfm rehype-raw
cd ..
```

This will install:
- `react-markdown` - Markdown renderer for React
- `remark-gfm` - GitHub Flavored Markdown support (tables, strikethrough, etc.)
- `rehype-raw` - Support for HTML in markdown

After installation, restart the dev server.
