# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Architecture

Openza implements multiple layers of security to protect user credentials and sensitive data:

### 1. **Secure Token Storage**
- **Encrypted Storage**: All authentication tokens are stored in Electron's encrypted storage
- **Main Process Only**: Sensitive credentials (client secrets) are only accessible in the main process
- **No localStorage**: Tokens are never stored in browser localStorage
- **Automatic Cleanup**: Tokens are cleared on logout and app uninstall

### 2. **OAuth 2.0 Implementation**
- **Industry Standard**: Uses OAuth 2.0 authorization code flow
- **System Browser**: Microsoft authentication uses system browser for enhanced security
- **PKCE Support**: Implements Proof Key for Code Exchange where applicable
- **Token Refresh**: Automatic silent token refresh with fallback to interactive auth

### 3. **IPC Security**
- **Context Isolation**: Renderer process runs with context isolation enabled
- **No Node Integration**: Renderer process has no direct Node.js access
- **Validated IPC**: All IPC calls are validated and sanitized
- **Main Process Secrets**: All API secrets remain in main process only

### 4. **Code Security**
- **Content Security Policy**: Strict CSP enforced
- **Sandboxing**: Renderer process runs in a sandbox
- **Input Validation**: All user inputs are validated and sanitized
- **XSS Prevention**: Proper escaping and sanitization of dynamic content

### 5. **Build Security**
- **No Bundled Secrets**: Environment variables are never bundled in distributions
- **Signed Releases**: Official releases are signed (planned)
- **Dependency Scanning**: Regular security audits of dependencies

## Security Best Practices for Users

### Environment Setup

1. **Never commit `.env.local`**: Your API credentials should never be in version control
2. **Keep secrets private**: Client IDs and secrets should not be shared publicly
3. **Use secure networks**: Avoid using public WiFi for OAuth flows
4. **Update regularly**: Keep Openza and dependencies up to date

### API Credentials

1. **Create your own app credentials**:
   - For Todoist: https://developer.todoist.com/appconsole.html
   - For Microsoft: https://portal.azure.com/

2. **Restrict redirect URIs**:
   - Only add necessary redirect URIs
   - Use custom protocol schemes for production (`openza://`)

3. **Revoke unused credentials**: Remove old or unused OAuth applications

### Data Security

- **Local Database**: Task data is stored locally in SQLite
- **Encryption at Rest**: Consider using full disk encryption
- **Network Security**: All API calls use HTTPS
- **Token Expiry**: Tokens automatically expire and refresh

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Preferred Contact Method

Email security concerns to: **deependra@solanky.dev**

### What to Include

Please include:

1. **Description**: Detailed description of the vulnerability
2. **Impact**: Potential security impact and affected components
3. **Reproduction**: Step-by-step instructions to reproduce
4. **Environment**: OS, Openza version, and other relevant details
5. **Proof of Concept**: Code or screenshots demonstrating the issue (if applicable)
6. **Suggested Fix**: Your recommendation for fixing the issue (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Status Updates**: Every 2 weeks until resolution
- **Fix Timeline**: Depends on severity (critical issues prioritized)

### Disclosure Policy

- **Coordinated Disclosure**: We follow responsible disclosure practices
- **Embargo Period**: Please allow reasonable time for a fix before public disclosure
- **Credit**: Security researchers will be credited (unless anonymity is requested)

## Known Security Considerations

### Client Secrets in Electron

**Issue**: Electron apps can't truly hide client secrets from determined attackers

**Mitigation**:
- Client secrets are kept in main process only
- App uses code sandboxing and obfuscation
- Users should create their own OAuth applications for maximum security
- Production apps should implement backend proxy for ultra-sensitive operations

### Token Storage

**Current**: Tokens stored in Electron's encrypted storage

**Limitations**:
- Encryption strength depends on OS keychain/credential manager
- Root/admin access could potentially access tokens

**Recommendations**:
- Use OS-level security features (disk encryption, secure boot)
- Log out when not using the application
- Use account-level security (2FA) on connected services

### Network Security

**Protected**:
- All API calls use HTTPS
- Certificate validation enabled
- No mixed content

**User Responsibility**:
- Use trusted networks
- Keep OS and certificates updated
- Monitor account activity on connected services

## Security Updates

Security updates will be released as:
- **Critical**: Immediate patch release
- **High**: Patch within 1 week
- **Medium**: Next minor version
- **Low**: Next major version

Subscribe to [GitHub releases](https://github.com/openza/openza-desktop/releases) for update notifications.

## Security Checklist for Contributors

When contributing code:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation for all user inputs
- [ ] Proper error handling (no sensitive data in errors)
- [ ] IPC calls validated and sanitized
- [ ] Dependencies are up to date
- [ ] No console.log of tokens or secrets
- [ ] Renderer process has no direct access to secrets
- [ ] OAuth flows follow security best practices

## Third-Party Security

Openza integrates with:

- **Todoist API**: https://developer.todoist.com/
- **Microsoft Graph API**: https://docs.microsoft.com/en-us/graph/

Users should review these services' security policies:
- [Todoist Security](https://todoist.com/security)
- [Microsoft Security](https://www.microsoft.com/en-us/security)

## Acknowledgments

We appreciate the security research community's efforts in keeping Openza secure. Responsible disclosure contributors will be acknowledged here.

---

**Last Updated**: January 2025

For general questions: deependra@solanky.dev
For security issues: deependra@solanky.dev (with "SECURITY" in subject)
