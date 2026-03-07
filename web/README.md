# Complaint Management Dashboard

A comprehensive admin dashboard for managing and resolving complaints reported from your mobile application. The dashboard provides real-time analytics, severity-based prioritization, and a complete resolution workflow.

## Features

### Dashboard Analytics
- **Total Complaints Count**: Overview of all reported complaints
- **Severity Distribution**: Pie chart showing LOW, MODERATE, and HIGH severity complaints
- **Status Breakdown**: Visual representation of OPEN, IN_PROGRESS, and RESOLVED statuses
- **Trends Over Time**: 7-day trend line chart showing complaint volume
- **Resolution Metrics**: 
  - Resolution rate percentage
  - Average resolution time
  - Status distribution cards with color-coded indicators

### Complaint Management
- **Comprehensive Table View**: Browse all complaints with sorting and filtering
- **Advanced Filtering**:
  - Search by complaint ID, title, or user name
  - Filter by severity level (HIGH, MODERATE, LOW)
  - Filter by status (OPEN, IN_PROGRESS, RESOLVED)
- **Real-time Sorting**: Click column headers to sort by severity, status, or reported date

### Resolution Workflow
Click the "Resolve" button on any complaint to open the resolution modal with the following capabilities:

#### Actions Available
1. **Update Status**: Transition complaint through workflow states
   - OPEN → IN_PROGRESS → RESOLVED

2. **Assign to Team Member**: Distribute work among your team
   - John Doe
   - Jane Smith
   - Mike Johnson
   - Sarah Williams
   - Alex Brown

3. **Set Deadline**: Track expected completion dates with datetime picker

4. **Change Priority**: Adjust severity level if needed (HIGH, MODERATE, LOW)

5. **Add Resolution Notes**: Document the solution and actions taken

### Key Metrics Displayed
- **Total Complaints**: All complaints in the system
- **Open**: Awaiting action
- **In Progress**: Being actively worked on
- **Resolved**: Completed complaints
- **Resolution Rate**: Percentage of resolved complaints

## Mock Data

The dashboard comes with 12 sample complaints covering various scenarios:
- Technical issues (app crashes, API errors)
- Payment problems
- UI/UX issues
- Performance concerns
- Bug reports
- Feature requests

Each complaint includes:
- Unique ID
- Title and detailed description
- Severity level (LOW, MODERATE, HIGH)
- Status (OPEN, IN_PROGRESS, RESOLVED)
- Reported date and user information
- Assignment status
- Resolution notes (if completed)

## Color Coding

### Severity Levels
- **RED**: HIGH severity (immediate action required)
- **YELLOW/ORANGE**: MODERATE severity (address soon)
- **GREEN**: LOW severity (can be handled later)

### Status
- **RED**: OPEN (awaiting action)
- **BLUE**: IN_PROGRESS (being worked on)
- **GREEN**: RESOLVED (completed)

## Getting Started

### Installation
1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Project Structure
```
/app
  - page.tsx          # Main dashboard page
  - layout.tsx        # App layout with theme provider
  - globals.css       # Global styles

/components
  - DashboardStats.tsx      # KPI cards and metrics
  - AnalyticsCharts.tsx     # Recharts visualizations
  - ComplaintsTable.tsx     # Filterable/sortable complaint table
  - ResolutionModal.tsx     # Complaint details and resolution form

/lib
  - api.ts            # HTTP client for backend endpoints
  - mockData.ts       # Mock complaints and helper functions (used for types & offline)
```

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **UI Components**: Shadcn/ui with Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React hooks
- **Database**: Mock data (ready to integrate with real database)

## Future Integration

To connect this dashboard to a real database:

1. Replace mock data in `/lib/mockData.ts` with actual API calls
   - the project now ships with `/lib/api.ts` which defines `fetchComplaints` and `updateComplaint`.
   - configure `NEXT_PUBLIC_BACKEND_URL` in your `.env.local` to point at your running backend (defaults to `http://yourlocalhost:4000`).
2. Implement backend endpoints for:
   - Fetching complaints
   - Updating complaint status
   - Assigning complaints
   - Adding resolution notes

3. Popular integration options:
   - Supabase (PostgreSQL)
   - Neon (Serverless PostgreSQL)
   - Firebase
   - MongoDB

## Customization

### Adding More Team Members
Edit `teamMemberList` in `/lib/mockData.ts`:
```typescript
const teamMembers = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Alex Brown'];
```

### Modifying Complaint Categories
Update the `category` field in mock complaints data.

### Adjusting Analytics Calculations
Modify calculation functions in `getComplaintStats()` and `getComplaintsTrend()` in `/lib/mockData.ts`.

## Performance Considerations

- Table data is filtered and sorted client-side (suitable for < 1000 complaints)
- For larger datasets, consider:
  - Pagination
  - Server-side filtering
  - Virtual scrolling
  - Caching strategies

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive design)

## License

Created with v0.app
