
import SwiftUI
@preconcurrency import WebKit  

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://www.example.com/")!)
            .frame(width: 1440, height: 1280)
    }
}

struct WebView: NSViewRepresentable {
    let url: URL
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        
        // 配置偏好设置
        let preferences = WKPreferences()
        preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.preferences = preferences
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.uiDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    @MainActor
    class Coordinator: NSObject, WKUIDelegate {
        func webView(_ webView: WKWebView,
                    runOpenPanelWith parameters: WKOpenPanelParameters,
                    initiatedByFrame frame: WKFrameInfo,
                    completionHandler: @escaping ([URL]?) -> Void) {
            
            let openPanel = NSOpenPanel()
            openPanel.canChooseFiles = true
            openPanel.canChooseDirectories = false
            openPanel.allowsMultipleSelection = parameters.allowsMultipleSelection
            openPanel.allowedContentTypes = [.image]
            
            openPanel.begin { response in
                if response == .OK {
                    completionHandler(openPanel.urls)
                } else {
                    completionHandler(nil)
                }
            }
        }
    }
}
