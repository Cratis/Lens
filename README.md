# Lens — Cratis Arc Developer Productivity Extension

**Lens** is a browser extension for developers using the **Cratis Stack**
(Cratis Arc + Cratis Chronicle). It streamlines development and testing by
letting you manage tenants, users, and test commands and queries directly
from your browser — while automatically injecting the correct HTTP headers
into your requests.

## What It Does

Lens bridges the gap between your Cratis Arc application and your development
workflow. Instead of manually crafting headers, switching contexts, or rebuilding
code to test different tenant/user scenarios, Lens lets you:

### 🏢 Tenant Selector

Switch between different tenants on the fly. Lens automatically injects the correct
tenancy header into all requests, making it simple to test multi-tenant behavior
without restarting your application.

### 👤 User Selector

Simulate requests from different users by selecting them from the extension UI.
Your identity headers are automatically set, so your application routes requests
with the correct user context.

### 🧪 Command & Query Explorer

Navigate, inspect, and execute commands and queries directly from the extension:

- **Browse** all available commands and queries in your Cratis Arc application
- **Test** commands by filling in parameters and seeing results in real-time
- **Execute** queries and inspect response payloads
- **Validate** your backend logic without writing test code

### 🔧 Development Context Management

View and manage the current context (tenant, user, and other identity
information) at a glance.

## How It Works

### HTTP Header Injection

Lens injects HTTP headers into requests made by your web application when the
extension is active. This happens transparently — your frontend code doesn't
need to change.

#### Identity Headers

When you select a user, Lens injects headers following the
[Cratis Arc Authentication specification](https://www.cratis.io/arc/backend/core/authentication/#microsoft-identity-platform-azure):

- Identity context headers that identify the current user
- Claims and permissions that your backend uses for authorization

#### Tenancy Headers

When you select a tenant, Lens injects the tenancy header according to the
[Cratis Arc Tenancy Resolvers specification](https://www.cratis.io/arc/backend/tenancy/resolvers/):

- Tenant identifier headers that route requests to the correct tenant partition
- Multi-tenant context information for your application

### Automatic Context Propagation

All headers are injected automatically into:

- Command execution requests
- Query requests
- Any HTTP calls made by your application

Your backend receives properly authenticated and tenant-scoped requests, so you
can test complex scenarios without manual header manipulation.

## Features at a Glance

| Feature | Purpose |
| --- | --- |
| **Tenant Selector** | Switch tenants instantly; header auto-injected |
| **User Selector** | Simulate different users; identity headers |
| **Arc Development Sources** | Configure local or remote Cratis Arc |
| **Command Explorer** | Browse and execute backend commands |
| **Query Explorer** | Run queries and inspect payloads |
| **Context View** | See tenant, user, and identity context |

## Getting Started

### Installation

1. Clone or download the Lens repository
2. Navigate to the `Source/` directory
3. Build the extension (see [Development](#development) below)
4. Load the built extension into Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the built output directory

### Configuration

Once installed, configure Lens to connect to your Cratis Arc backend:

1. Open the Lens extension popup
2. Go to **Settings**
3. Add your Arc Development Sources (local or remote endpoints)
4. Set up users and tenants for your testing scenarios

## Development

### Build

```bash
cd Source
yarn install
yarn build
```

This builds the extension into a directory that can be loaded into Chrome.

### Development Server

For active development with hot reload:

```bash
cd Source
yarn dev
```

### Run Tests

```bash
cd Source
yarn test
```

## Project Structure

```plaintext
Source/
├── manifest.json           # Extension manifest
├── main.tsx / LensPopup.tsx # Main UI entry point
├── background/             # Service worker for header injection
├── commands/               # Command explorer functionality
├── queries/                # Query explorer functionality
├── settings/               # Configuration and tenant/user management
├── context/                # Identity and tenancy context
├── shared/                 # Shared utilities and types
└── arc/                    # Cratis Arc integration
```

## Why Lens?

Working with Cratis Arc during development often means:

- Manually setting authentication headers to test different users
- Rebuilding your app to change tenants
- Writing inline tests for every command/query
- Struggling to understand what data your backend returns

**Lens eliminates this friction.** By bringing tenant/user management and
command/query testing into your browser, you can focus on building features
instead of setting up test harnesses.

## Links

- [Cratis Arc Documentation](https://www.cratis.io/arc/)
- [Authentication & Identity](https://www.cratis.io/arc/backend/core/authentication/#microsoft-identity-platform-azure)
- [Tenancy & Resolvers](https://www.cratis.io/arc/backend/tenancy/resolvers/)
- [Cratis Chronicle](https://www.cratis.io/chronicle/)

## License

See [LICENSE](LICENSE) file for details.
