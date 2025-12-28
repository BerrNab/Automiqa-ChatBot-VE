(function () {
    const script = document.currentScript;
    const chatbotId = script.getAttribute('data-chatbot-id');
    if (!chatbotId) {
        console.error("Automiqa: No chatbot ID provided in script tag. Use data-chatbot-id='YOUR_ID'");
        return;
    }

    // Derive base URL from the script source itself
    const scriptUrl = new URL(script.src);
    const widgetBaseUrl = scriptUrl.origin;

    const containerId = "automiqa-widget-container-" + chatbotId;

    if (document.getElementById(containerId)) return;

    const container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.zIndex = '999999';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.width = '80px';
    container.style.height = '80px';
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.pointerEvents = 'none';

    const iframe = document.createElement('iframe');
    iframe.src = widgetBaseUrl + "/widget/" + chatbotId;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '24px';
    iframe.style.overflow = 'hidden';
    iframe.style.pointerEvents = 'auto';
    iframe.style.boxShadow = 'none';
    iframe.style.transition = 'all 0.3s ease';
    iframe.title = "Chat Support";

    container.appendChild(iframe);
    document.body.appendChild(container);

    window.addEventListener('message', function (event) {
        if (event.origin !== widgetBaseUrl) return;

        if (event.data.type === 'widget-status') {
            if (event.data.isOpen) {
                if (event.data.isMinimized) {
                    container.style.width = '350px';
                    container.style.height = '80px';
                } else {
                    container.style.width = window.innerWidth < 500 ? 'calc(100vw - 40px)' : '400px';
                    container.style.height = window.innerWidth < 500 ? 'calc(100vh - 40px)' : '600px';
                }
                iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
            } else {
                container.style.width = '80px';
                container.style.height = '80px';
                iframe.style.boxShadow = 'none';
            }
        }
    });
})();
