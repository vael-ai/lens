# Vael Context Bank

The Vael Context Bank is a browser extension that securely collects and organizes browsing data to provide context for AI agents. This extension helps users connect their browsing behavior with developers building intelligent agents, enabling more personalized and contextually aware AI assistance.

## Key Features

- **Comprehensive Data Collection**: Captures page metadata, user interactions, device information, and page content
- **Domain-Specific Intelligence**: Special handling for e-commerce, travel, and productivity websites
- **Privacy-First Design**: Granular controls for what data gets collected, with domain blacklisting
- **Real-Time Indication**: Visual feedback on when data is being collected
- **Transparent and Open Source**: Fully inspectable code for security and privacy

## Installation

### Development Build

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. **Important**: Add icon files to the `assets` directory:
   - Create `icon.png` as the main extension icon
   - For status indicators (optional), create `idle.png`, `collecting.png`, and `disabled.png`
4. Run the development build:
   ```
   pnpm dev
   ```
5. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` directory

### Production Build

1. Ensure icon files are added to the `assets` directory
2. Build the extension:
   ```
   pnpm build
   ```
3. Package it:
   ```
   pnpm package
   ```
4. The packaged extension will be in the `build/` directory

## Usage

1. **Configure Data Collection**:

   - Open the extension popup by clicking its icon
   - Toggle which types of data you want to collect
   - Add domains to the blacklist to prevent data collection on specific sites

2. **Monitor Collection Status**:

   - The extension badge shows the current collection status:
     - (No badge): Ready to collect (idle)
     - "REC" badge (green): Actively collecting data
     - "OFF" badge (gray): Collection disabled for this site

3. **Detailed Settings**:
   - Access full configuration through the options page
   - Right-click the extension icon and select "Options"
   - Adjust advanced settings and view privacy information

## Privacy and Data Control

Vael Context Bank puts you in control of your data:

- All data collection can be toggled on/off
- Sensitive domains are blacklisted by default
- You can add any domain to the blacklist
- All data is encrypted during transmission
- No data is stored locally other than your preferences

## Developer Integration

Vael Context Bank is designed to work with the Vael AI platform, providing context to AI agents that have been granted access by the user.

For integration details, visit [Vael AI Developer Documentation](https://vael.ai/docs).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Vael AI Team - [contact@vael.ai](mailto:contact@vael.ai)

Project Link: [https://github.com/vael-ai/context-bank-extension](https://github.com/vael-ai/context-bank-extension)
