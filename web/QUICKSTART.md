# Quick Start Guide

## Installation & Running

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Dashboard Overview

### 1. Header Section
- **Title**: Complaint Management
- **Refresh Button**: Reload data (currently resets to mock data)

### 2. KPI Cards (Dashboard Stats)
View key metrics at a glance:
- **Total Complaints**: All complaints in system
- **Open**: Complaints awaiting action
- **In Progress**: Complaints being worked on
- **Resolved**: Completed complaints
- **Resolution Rate**: Percentage of resolved/total

### 3. Analytics Section (Charts)
Three visual representations:
- **Severity Distribution**: Pie chart showing HIGH/MODERATE/LOW breakdown
- **Status Breakdown**: Pie chart showing OPEN/IN_PROGRESS/RESOLVED distribution
- **Trends (Last 7 Days)**: Line chart showing complaint volume over time

### 4. Complaints Table
Browse all complaints with powerful filtering and sorting.

#### Using Filters
- **Search Box**: Find complaints by ID, title, or user name
- **Severity Dropdown**: Filter by HIGH, MODERATE, or LOW
- **Status Dropdown**: Filter by OPEN, IN_PROGRESS, or RESOLVED

#### Sorting
- Click on column headers to sort:
  - **Severity** (click header)
  - **Status** (click header)
  - **Reported Date** (click header)
- Click again to reverse sort order (indicated by ↑ or ↓)

### 5. Resolving a Complaint

**Step 1:** Click the "Resolve" button on any complaint row
- Opens a modal with complaint details

**Step 2:** Update complaint details:
- **Status**: Change workflow state (OPEN → IN_PROGRESS → RESOLVED)
- **Severity**: Adjust priority if needed
- **Assign To**: Select a team member (or leave unassigned)
- **Deadline**: Set expected completion date

**Step 3:** Add resolution notes:
- Document what was done
- Record the solution applied
- Add any relevant information

**Step 4:** Click "Save Changes"
- Modal closes and table updates
- Changes are immediately visible

## Sample Complaints

The dashboard includes 12 pre-loaded complaints:

| ID | Title | Severity | Status | Category |
|----|-------|----------|--------|----------|
| 1 | App crashes on login | HIGH | IN_PROGRESS | Technical Issue |
| 2 | Payment gateway timeout | HIGH | OPEN | Payment |
| 3 | UI elements misaligned on tablet | MODERATE | IN_PROGRESS | UI/UX |
| 4 | Slow data loading | MODERATE | OPEN | Performance |
| 5 | Typo in user profile section | LOW | RESOLVED | Bug |
| 6 | Export to PDF not working | MODERATE | OPEN | Feature Request |
| 7 | Dark mode toggle not persisting | LOW | OPEN | Bug |
| 8 | API rate limiting issue | HIGH | RESOLVED | Technical Issue |
| 9 | Notification emails not sending | MODERATE | IN_PROGRESS | Technical Issue |
| 10 | Missing language support | LOW | OPEN | Feature Request |
| 11 | Search not returning results | HIGH | OPEN | Bug |
| 12 | Mobile app force closes | HIGH | IN_PROGRESS | Technical Issue |

## Team Members

Available for assignment:
- John Doe
- Jane Smith
- Mike Johnson
- Sarah Williams
- Alex Brown

## Color Legend

### Severity Badges
- 🔴 **HIGH** (Red): Immediate action required
- 🟡 **MODERATE** (Orange/Yellow): Address soon
- 🟢 **LOW** (Green): Can be handled later

### Status Badges
- 🔴 **OPEN** (Red): Awaiting action
- 🟦 **IN_PROGRESS** (Blue): Being worked on
- 🟢 **RESOLVED** (Green): Completed

## Tips & Tricks

1. **Bulk Filtering**: Combine multiple filters to narrow down complaints
   - Example: Filter MODERATE severity + OPEN status to find mid-priority items needing attention

2. **Date Sorting**: Use "Reported Date" sort to find newest or oldest complaints

3. **Team Assignment**: Keep track of who's working on what by filtering by assignee

4. **Progress Tracking**: Sort by status to see workflow distribution

## Keyboard Shortcuts

- **Search Focus**: Click search box and start typing
- **Filter Reset**: Select "All Severities" or "All Status" to clear filters

## Future Enhancements

Once connected to a real database:
- Real-time data sync
- User authentication
- Historical analytics
- Export reports
- Email notifications
- Automated escalations

## Troubleshooting

**Issue**: Table not updating after saving
- Try clicking "Refresh Data" button in header

**Issue**: Modal not opening
- Ensure you clicked the "Resolve" button on a specific complaint row

**Issue**: Styles look wrong
- Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
- Restart dev server

## Example Workflow

1. **Start** at dashboard homepage
2. **View** severity distribution chart
3. **Filter** complaints to show only HIGH severity
4. **Sort** by reported date (newest first)
5. **Click** "Resolve" on first complaint
6. **Change** status to IN_PROGRESS
7. **Assign** to a team member
8. **Set** a deadline (tomorrow)
9. **Add** resolution notes
10. **Click** "Save Changes"
11. **View** updated dashboard metrics

---

**Need Help?** Refer to README.md for detailed documentation.
