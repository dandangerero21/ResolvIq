package com.rbcits.backend.services;

import org.springframework.web.util.HtmlUtils;

/**
 * Inline-styled HTML for mail clients; matches ResolvIQ marketing UI (dark base, red accent, system sans stack).
 */
final class EmailHtmlTemplates {

    static final String BG = "#05010d";
    static final String SURFACE = "#0c0718";
    static final String BORDER = "rgba(220, 38, 38, 0.35)";
    static final String ACCENT = "#dc2626";
    static final String TEXT = "#f4f4f5";
    static final String MUTED = "rgba(255, 255, 255, 0.55)";

    private EmailHtmlTemplates() {}

    static String escape(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }

    /**
     * Builds full document. Uses placeholders (not {@link String#format}) so user content with {@code %} is safe.
     */
    static String layout(String appName, String headline, String innerHtml) {
        String safeApp = escape(appName);
        String safeHeadline = escape(headline);
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>__TITLE__</title>
                </head>
                <body style="margin:0;padding:0;background-color:__BG__;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:__BG__;padding:32px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%" style="max-width:520px;border-collapse:collapse;">
                          <tr>
                            <td style="padding:0 0 20px 0;">
                              <span style="display:inline-block;background-color:__ACCENT__;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:8px 12px;border-radius:8px;">__APP__</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="background-color:__SURFACE__;border:1px solid __BORDER__;border-radius:16px;padding:28px 24px;box-shadow:0 8px 36px rgba(0,0,0,0.45);">
                              <h1 style="margin:0 0 12px 0;color:__TEXT__;font-size:22px;font-weight:700;line-height:1.2;">__HEADLINE__</h1>
                              __INNER__
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:20px 8px 0 8px;">
                              <p style="margin:0;color:__MUTED__;font-size:12px;line-height:1.5;">This message was sent by <strong style="color:__TEXT__;">__APP2__</strong>. Please do not reply if this inbox is unmonitored.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """
                .replace("__TITLE__", safeApp)
                .replace("__BG__", BG)
                .replace("__ACCENT__", ACCENT)
                .replace("__APP__", safeApp)
                .replace("__SURFACE__", SURFACE)
                .replace("__BORDER__", BORDER)
                .replace("__TEXT__", TEXT)
                .replace("__HEADLINE__", safeHeadline)
                .replace("__INNER__", innerHtml)
                .replace("__MUTED__", MUTED)
                .replace("__APP2__", safeApp);
    }

    /** Inserts trusted HTML (caller must escape any user-derived text). */
    static String paragraph(String htmlContent) {
        return "<p style=\"margin:0 0 14px 0;color:"
                + TEXT
                + ";font-size:15px;line-height:1.55;\">"
                + htmlContent
                + "</p>";
    }

    static String mutedLine(String htmlContent) {
        return "<p style=\"margin:0 0 0 0;color:" + MUTED + ";font-size:13px;line-height:1.5;\">" + htmlContent + "</p>";
    }

    static String detailRow(String label, String value) {
        return "<tr><td style=\"padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:"
                + MUTED
                + ";font-size:12px;text-transform:uppercase;letter-spacing:0.08em;width:38%;\">"
                + escape(label)
                + "</td><td style=\"padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:"
                + TEXT
                + ";font-size:14px;\">"
                + escape(value)
                + "</td></tr>";
    }

    static String detailsTable(String rowsHtml) {
        return "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:16px 0 0 0;border-collapse:collapse;\">"
                + rowsHtml
                + "</table>";
    }

    static String callout(boolean success, String htmlContent) {
        String border = success ? "rgba(34, 197, 94, 0.35)" : "rgba(248, 113, 113, 0.35)";
        String bg = success ? "rgba(34, 197, 94, 0.08)" : "rgba(248, 113, 113, 0.08)";
        return "<div style=\"margin-top:18px;padding:14px 16px;border-radius:12px;border:1px solid "
                + border
                + ";background-color:"
                + bg
                + ";color:"
                + TEXT
                + ";font-size:14px;line-height:1.5;\">"
                + htmlContent
                + "</div>";
    }

          static String primaryButton(String href, String label) {
            return "<p style=\"margin:18px 0 0 0;\">"
                + "<a href=\""
                + escape(href)
                + "\" style=\"display:inline-block;background-color:"
                + ACCENT
                + ";color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;\">"
                + escape(label)
                + "</a></p>";
          }
}
