## fix install path

- Server installation path should follow the format: {base}/.vibe-control/{repo-name}
  - {base} should default to the user's home directory
  - {repo-name} should be the name of the git repository being cloned
- The base installation directory should be configurable
- The current installation path should be visible in the UI
- All server-related paths should use this structure:
  - Install path: {base}/.vibe-control/{repo-name}
  - Data path: {base}/.vibe-control/{repo-name}/data
  - Log path: {base}/.vibe-control/{repo-name}/logs

## update server list

- the server list should be updated to show the server name, version,
- the server list should be sorted by the server name
- the server list should be searchable
- the server list should be filterable
- add ui buttons for configuration and logs
- remove the the logs and configuration buttons from the top nav

# Refactor UI Components

- the existing components should be refactored into smaller, reusable components
- the components should be styled with the tailwind css classes
- the components should be responsive
- the components should be accessible
- the components should be styled with the tailwind css classes
- the components should be tested
- the components should be documented
- dont duplicate components and check if the component already exists before creating a new one

## React Component Improvements

### Structure & Organization

- Create consistent component architecture between main app and mcp_ui
- Extract UI primitives library for reuse across both apps
- Break down large components (Dashboard.jsx, \_index.tsx)
- Establish clear container/presentational component pattern

### State Management

- Implement consistent data fetching strategy with custom hooks
- Extend useNeuralState with proper TypeScript interfaces
- Consider React Query/SWR for API state
- Reduce direct state manipulation in components

### Code Quality

- Standardize file extensions (.tsx throughout)
- Add proper TypeScript interfaces for all component props
- Create shared utility functions for common operations
- Implement consistent error handling

### Styling

- Adopt single styling approach (CSS modules or Tailwind)
- Create design system with tokens and documentation
- Remove inline styles in Terminal.tsx and NeuralNet.tsx
- Implement responsive design patterns

### Performance

- Add memoization for expensive components
- Implement proper cleanup in useEffect hooks
- Add virtualization for large lists in ServerList and LogViewer
- Lazy load components where appropriate
