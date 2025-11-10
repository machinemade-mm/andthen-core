# and then? (Core)

**Open source, keyboard-first task management. Run locally, unlimited everything.**

## Features

- **Unlimited** projects, goals, and tasks
- **Keyboard-first** navigation - arrow keys, space, enter
- **Local SQLite database** - your data stays on your machine
- **No sign-up required** - start using immediately
- **Dark mode** - easy on the eyes
- **Open source** - AGPL-3.0 license

## Quick Start

```bash
# Install dependencies (database is set up automatically)
npm install

# Start the app
npm run dev
```

Open http://localhost:5173 and start creating!

## Security Configuration

**⚠️ IMPORTANT:** Before deploying to production or exposing to the internet:

1. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. **Generate a strong JWT secret:**
   ```bash
   openssl rand -base64 32
   ```

3. Replace `JWT_SECRET` in your `.env` file with the generated value

**Never use the default JWT_SECRET in production!** The default value is publicly visible in this repository and is only safe for local development.

## Data Persistence

**Your data is safe!** All your tasks, projects, and goals are stored in a local SQLite database file: `andthen.db`

- Data persists between sessions
- Database file is located in the project root
- **Never deleted** unless you manually remove it
- Single user, single file, simple and reliable

### Database Location

The database file `andthen.db` is created in:
```
/path/to/andthenwhat/core/andthen.db
```

### Backup Your Data

Simply copy the `andthen.db` file to back up all your tasks and projects!

## Keyboard Shortcuts

- `←` `→` - Navigate between project columns
- `↑` `↓` - Navigate between tasks
- `Space` - Toggle task completion
- `Enter` - Edit task/project name
- `.` - Insert new task after current
- `Backspace` - Delete task or project
- `Esc` - Cancel editing

## Upgrade to Pro

Want AI task suggestions, cloud sync, and team features?

👉 [Upgrade to and then? Pro](https://andthenwhat.app)

## Development

```bash
# Run database migrations manually (optional - runs automatically on install)
npm run db:migrate

# Type checking
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

AGPL-3.0 - see LICENSE file

---

Made with ❤️ for keyboard warriors everywhere
