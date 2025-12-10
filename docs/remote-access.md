# Remote Access Guide

To access the application from other devices (e.g., mobile phones) with camera support, you need a secure HTTPS connection. We use `localtunnel` to provide this.

## How to use

1.  **Start the development server** in one terminal:
    ```bash
    npm run dev
    ```

2.  **Start the secure tunnel** in a **second** terminal:
    ```bash
    npm run share
    ```

3.  **Copy the URL**: The `share` command will output a URL (e.g., `https://funny-cat-42.loca.lt`).

4.  **Open on Device**: Open this URL on your mobile device.
    *   **Note**: On the first visit, `localtunnel` might ask for a password. This is usually the external IP of your computer, but for quick testing, you can often just click "Click to Continue" if prompted, or use the IP address method if localtunnel is being strict.

## Troubleshooting

*   **Camera still not working?** Ensure you are using the **HTTPS** link, not HTTP.
*   **Page not loading?** Make sure `npm run dev` is still running in the other terminal.
