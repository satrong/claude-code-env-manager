use axum::{
    Router,
    extract::State,
    routing::post,
    Json,
};
use serde::Deserialize;
use tauri::{Manager, Emitter};
use tower_http::cors::CorsLayer;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct NotifyPayload {
    pub title: String,
    pub body: String,
}

pub async fn notify_handler(
    State(app_handle): State<Arc<tauri::AppHandle>>,
    Json(payload): Json<NotifyPayload>,
) -> &'static str {
    let _ = app_handle.emit("notification-received", serde_json::json!({
        "title": payload.title,
        "body": payload.body,
    }));

    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }

    "ok"
}

pub async fn start(app_handle: tauri::AppHandle) -> Result<(), String> {
    let state = app_handle.state::<crate::HttpServerState>();
    let app = Router::new()
        .route("/notify", post(notify_handler))
        .layer(CorsLayer::permissive())
        .with_state(Arc::new(app_handle.clone()));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind HTTP server: {}", e))?;

    let port = listener.local_addr()
        .map_err(|e| format!("Failed to get local addr: {}", e))?
        .port();

    {
        let mut guard = state.port.lock().await;
        *guard = Some(port);
    }

    eprintln!("HTTP notification server listening on 127.0.0.1:{}", port);

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("HTTP server error: {}", e))?;

    Ok(())
}
