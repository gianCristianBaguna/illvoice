# Developer Guide

## For Developers Who Want to Understand or Modify the Code

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Data Flow](#data-flow)
4. [Adding Features](#adding-features)
5. [Modifying Components](#modifying-components)
6. [Styling Guide](#styling-guide)
7. [Performance Tips](#performance-tips)
8. [Common Patterns](#common-patterns)

---

## Architecture Overview

### High-Level Structure

```
Next.js App Router
    ↓
[app/page.tsx] (Main Page)
    ├── DashboardStats (Display KPIs)
    ├── AnalyticsCharts (Display Charts)
    ├── ComplaintsTable (Display & Filter Data)
    └── ResolutionModal (Edit Data)
    ↓
[lib/mockData.ts] (Data Source)
```

### Rendering Strategy

- **Server Components**: layout.tsx (static setup)
- **Client Components**: All data-driven components marked with 'use client'
- **State Management**: React hooks (useState, useMemo)
- **Data Fetching**: Currently mock data (ready for API integration)

---

## Component Structure

### 1. DashboardStats Component

**File**: `components/DashboardStats.tsx`

**Purpose**: Display key performance indicator cards

**Structure**:
```tsx
export function DashboardStats() {
  // Get statistics from mockData
  const stats = getComplaintStats();
  
  // Render 5 KPI cards
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Card */}
      {/* Open Card */}
      {/* In Progress Card */}
      {/* Resolved Card */}
      {/* Resolution Rate Card */}
    </div>
  );
}
```

**Key Points**:
- Uses Tailwind responsive grid
- Imports `getComplaintStats()` from mockData
- Returns styled Card components with metrics
- Color-coded values (red, yellow, green)

**Customization**:
```tsx
// Add a new card
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      New Metric
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{newValue}</div>
    <p className="text-xs text-muted-foreground mt-1">Description</p>
  </CardContent>
</Card>
```

---

### 2. AnalyticsCharts Component

**File**: `components/AnalyticsCharts.tsx`

**Purpose**: Display data visualizations using Recharts

**Structure**:
```tsx
export function AnalyticsCharts() {
  // Get data from mockData
  const stats = getComplaintStats();
  const trend = getComplaintsTrend();
  
  // Prepare data for charts
  const severityData = [...];
  const statusData = [...];
  
  // Render 3 charts
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Severity Pie Chart */}
      {/* Status Pie Chart */}
      {/* Trend Line Chart */}
    </div>
  );
}
```

**Chart Types Used**:
- `PieChart` - For severity and status distribution
- `LineChart` - For trend data
- `ResponsiveContainer` - For responsive sizing

**Customization Example** - Add a bar chart:
```tsx
import { BarChart, Bar } from 'recharts';

const categoryData = /* prepare data */;

<Card>
  <CardHeader>
    <CardTitle className="text-base">Category Breakdown</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={categoryData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

---

### 3. ComplaintsTable Component

**File**: `components/ComplaintsTable.tsx`

**Purpose**: Display, filter, and sort complaint data

**Key Features**:
- Search by ID, title, or user name
- Filter by severity and status
- Sort by severity, status, or reported date
- Responsive table with horizontal scroll
- Color-coded badges

**Structure**:
```tsx
export function ComplaintsTable({ 
  complaints, 
  onComplaintClick, 
  onComplaintsUpdate 
}) {
  // State for filters and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('reportedDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Memoized filter & sort logic
  const filteredAndSorted = useMemo(() => {
    // Complex filtering logic
  }, [complaints, searchTerm, severityFilter, statusFilter, sortField, sortOrder]);
  
  // Render filters + table
  return (
    <Card>
      {/* Filters */}
      {/* Table */}
      {/* Rows with Resolve buttons */}
    </Card>
  );
}
```

**Filter Logic**:
```tsx
const filtered = complaints.filter((complaint) => {
  const matchesSearch = complaint.title.toLowerCase()
    .includes(searchTerm.toLowerCase());
  const matchesSeverity = severityFilter === 'ALL' 
    || complaint.severity === severityFilter;
  const matchesStatus = statusFilter === 'ALL' 
    || complaint.status === statusFilter;
  
  return matchesSearch && matchesSeverity && matchesStatus;
});
```

**Sort Logic**:
```tsx
const sorted = [...filtered].sort((a, b) => {
  let aVal = a[sortField];
  let bVal = b[sortField];
  
  if (sortField === 'reportedDate') {
    aVal = new Date(aVal).getTime();
    bVal = new Date(bVal).getTime();
  }
  
  return sortOrder === 'asc' 
    ? aVal > bVal ? 1 : -1
    : aVal < bVal ? 1 : -1;
});
```

**Badge Colors**:
```tsx
const getSeverityColor = (severity) => {
  switch (severity) {
    case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'MODERATE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

---

### 4. ResolutionModal Component

**File**: `components/ResolutionModal.tsx`

**Purpose**: Edit and resolve complaint details

**Structure**:
```tsx
export function ResolutionModal({ 
  complaint, 
  isOpen, 
  onClose, 
  onSave 
}) {
  // Local form state
  const [formData, setFormData] = useState(complaint);
  
  // Handle input changes
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };
  
  // Save updated complaint
  const handleSave = () => {
    onSave(formData);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Modal content */}
    </Dialog>
  );
}
```

**Form Fields**:
1. **Status**: Dropdown (OPEN → IN_PROGRESS → RESOLVED)
2. **Severity**: Dropdown (HIGH, MODERATE, LOW)
3. **Assign To**: Dropdown (team members or unassigned)
4. **Deadline**: DateTime picker
5. **Resolution Notes**: Textarea

**DateTime Handling**:
```tsx
const deadline = formData.deadline;
const dateValue = deadline ? deadline.slice(0, 16) : '';

<Input
  type="datetime-local"
  value={dateValue}
  onChange={(e) => handleChange('deadline', 
    e.target.value ? new Date(e.target.value).toISOString() : ''
  )}
/>
```

---

## Data Flow

### Mock Data Structure

**File**: `lib/mockData.ts`

```typescript
// Type definitions
export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: ComplaintStatus;
  reportedDate: string;
  assignedTo?: string;
  deadline?: string;
  resolutionNotes?: string;
  category: string;
  userEmail: string;
  userName: string;
}

// Mock data array
export const mockComplaints: Complaint[] = [
  {
    id: '1',
    title: 'App crashes on login',
    // ... more fields
  },
  // ... 11 more complaints
];
```

### Helper Functions

**getComplaintStats()**:
```typescript
export function getComplaintStats() {
  const total = mockComplaints.length;
  const byStatus = {
    OPEN: mockComplaints.filter(c => c.status === 'OPEN').length,
    IN_PROGRESS: mockComplaints.filter(c => c.status === 'IN_PROGRESS').length,
    RESOLVED: mockComplaints.filter(c => c.status === 'RESOLVED').length,
  };
  const bySeverity = {
    HIGH: mockComplaints.filter(c => c.severity === 'HIGH').length,
    MODERATE: mockComplaints.filter(c => c.severity === 'MODERATE').length,
    LOW: mockComplaints.filter(c => c.severity === 'LOW').length,
  };
  // ... calculate resolution rate
  return { total, byStatus, bySeverity, resolutionRate, avgResolutionTime };
}
```

**getComplaintsTrend()**:
```typescript
export function getComplaintsTrend() {
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const count = mockComplaints.filter(c => {
      // Count complaints for this date
    }).length;
    trend.push({ date, complaints: count });
  }
  return trend;
}
```

### Data Update Flow

```
page.tsx (state holder)
    ↓
useState<Complaint[]>(mockComplaints)
    ↓
Pass complaints prop to ComplaintsTable
    ↓
User clicks "Resolve"
    ↓
ComplaintsTable calls onComplaintClick(complaint)
    ↓
page.tsx opens ResolutionModal
    ↓
User updates fields in modal
    ↓
User clicks "Save Changes"
    ↓
page.tsx.onSave(updatedComplaint)
    ↓
setComplaints(prev => prev.map(c => c.id === id ? updated : c))
    ↓
ComplaintsTable re-renders with new data
    ↓
DashboardStats recalculates metrics
```

---

## Adding Features

### Example 1: Add a New Filter

**In ComplaintsTable.tsx**:

```tsx
// 1. Add state
const [categoryFilter, setCategoryFilter] = useState('ALL');

// 2. Add to useMemo filter logic
const filtered = complaints.filter((complaint) => {
  // ... existing filters ...
  const matchesCategory = categoryFilter === 'ALL' 
    || complaint.category === categoryFilter;
  
  return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
});

// 3. Add UI for filter
<div>
  <label className="text-sm font-medium mb-2 block">Category</label>
  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Categories</SelectItem>
      <SelectItem value="Technical Issue">Technical Issue</SelectItem>
      <SelectItem value="Payment">Payment</SelectItem>
      <SelectItem value="UI/UX">UI/UX</SelectItem>
      <SelectItem value="Performance">Performance</SelectItem>
      <SelectItem value="Bug">Bug</SelectItem>
      <SelectItem value="Feature Request">Feature Request</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

### Example 2: Add a New KPI Card

**In DashboardStats.tsx**:

```tsx
// 1. Calculate the metric
const avgResolutionTime = stats.avgResolutionTime; // Already available

// 2. Add a new Card
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Avg Resolution Time
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{avgResolutionTime}h</div>
    <p className="text-xs text-muted-foreground mt-1">Hours to resolve</p>
  </CardContent>
</Card>

// 3. Update grid columns
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
  {/* Now 6 columns instead of 5 */}
</div>
```

---

### Example 3: Add a New Sortable Column

**In ComplaintsTable.tsx**:

```tsx
// 1. Add to sort field type
type SortField = 'reportedDate' | 'severity' | 'status' | 'category'; // Add 'category'

// 2. Add clickable header
<TableHead className="w-20 cursor-pointer" onClick={() => handleSort('category')}>
  Category {sortField === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
</TableHead>

// 3. Update sort logic to handle string fields
if (typeof aVal === 'string') {
  aVal = aVal.toLowerCase();
  bVal = bVal.toLowerCase();
}
```

---

## Modifying Components

### Changing Colors

**Option 1: Update globals.css**
```css
:root {
  --chart-1: oklch(0.646 0.222 41.116); /* Change primary color */
}
```

**Option 2: Update component className**
```tsx
// OLD
<div className="text-red-600">{stats.byStatus.OPEN}</div>

// NEW
<div className="text-blue-600">{stats.byStatus.OPEN}</div>
```

### Changing Layouts

**Adjust responsive breakpoints**:
```tsx
// OLD: 5 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">

// NEW: 4 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
```

### Changing Text

Search for the text in components and update directly:
```tsx
// OLD
<h1 className="text-3xl font-bold">Complaint Management</h1>

// NEW
<h1 className="text-3xl font-bold">Issue Tracker Dashboard</h1>
```

---

## Styling Guide

### Tailwind Classes Used

**Grid & Layout**:
```
grid, grid-cols-1, md:grid-cols-2, lg:grid-cols-5, gap-4, gap-x-2, gap-y-6
flex, flex-col, items-center, justify-between, justify-center
```

**Spacing**:
```
px-4, py-6, pt-4, pb-2, px-3, py-1, my-8, mt-1, mx-auto
```

**Typography**:
```
text-3xl, font-bold, text-sm, text-muted-foreground, text-center, text-balance
```

**Colors**:
```
bg-background, text-foreground, text-red-600, bg-red-100, text-red-800
```

**Borders & Shadows**:
```
border-b, border-border, rounded-full, rounded-md, shadow-xs
```

**Responsive**:
```
md:grid-cols-2, lg:grid-cols-5, min-h-screen, min-w-48, max-w-7xl
```

### Color System

**Design Tokens** (in globals.css):
```css
--primary: oklch(0.205 0 0);
--destructive: oklch(0.577 0.245 27.325);
--chart-1: oklch(0.646 0.222 41.116);
```

**Usage in components**:
```tsx
// Primary color
<Button className="bg-primary text-primary-foreground">Save</Button>

// Destructive
<Button className="bg-destructive">Delete</Button>

// Chart color
<div className="text-[oklch(0.646_0.222_41.116)]">Chart</div>
```

---

## Performance Tips

### 1. Memoization

**Already implemented**:
```tsx
const filteredAndSorted = useMemo(() => {
  // Complex filtering & sorting
}, [complaints, searchTerm, severityFilter, statusFilter, sortField, sortOrder]);
```

**Why**: Prevents recalculation on every render

### 2. Avoid Inline Functions

**Bad**:
```tsx
onClick={() => handleComplaintClick(complaint)} // Creates new function every render
```

**Good**: Function defined outside or memoized

### 3. Virtualization (for large tables)

When supporting 10,000+ complaints, use:
```tsx
import { FixedSizeList as List } from 'react-window';

// Wrap table rows with virtual scrolling
```

### 4. Code Splitting

For future analytics page:
```tsx
const AnalyticsPage = dynamic(() => import('@/components/AnalyticsPage'), {
  loading: () => <LoadingSpinner />,
});
```

---

## Common Patterns

### Pattern 1: Form Handling

```tsx
const [formData, setFormData] = useState(initialData);

const handleChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleSubmit = () => {
  onSave(formData);
};
```

### Pattern 2: Filter + Sort

```tsx
const processed = useMemo(() => {
  // 1. Filter
  let result = data.filter(item => matches(item));
  
  // 2. Sort
  result.sort((a, b) => compareFunc(a, b, sortOrder));
  
  return result;
}, [data, filters, sortField, sortOrder]);
```

### Pattern 3: State Lifting

```tsx
// Child needs to update parent state
<Child 
  data={items}
  onUpdate={(newItems) => setItems(newItems)}
/>
```

### Pattern 4: Conditional Rendering

```tsx
{isOpen && (
  <Modal>
    {complaint && (
      <ComplaintDetails complaint={complaint} />
    )}
  </Modal>
)}
```

---

## Database Integration Steps

### When You're Ready for Real Data

1. **Remove mockData**:
   - Delete mockData.ts imports
   - Replace with API calls

2. **Add API calls** (see `/lib/api.ts`). set `NEXT_PUBLIC_BACKEND_URL` in `.env.local` to point to your backend.
   ```tsx
   const [complaints, setComplaints] = useState([]);
   
   useEffect(() => {
     fetchComplaints().then(setComplaints);
   }, []);
   ```

3. **Update save handler**:
   ```tsx
   const handleSaveComplaint = async (updated) => {
     await updateComplaint(updated);
     setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
   };
   ```

4. **Add error handling**:
   ```tsx
   try {
     const result = await updateComplaint(updated);
     // Update state
   } catch (error) {
     showErrorToast(error.message);
   }
   ```

---

## Testing Tips

### Unit Tests Example

```tsx
// components/__tests__/DashboardStats.test.tsx
import { render, screen } from '@testing-library/react';
import { DashboardStats } from '../DashboardStats';

describe('DashboardStats', () => {
  it('displays total complaints', () => {
    render(<DashboardStats />);
    expect(screen.getByText('Total Complaints')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
```

---

## Debugging Tips

### Console Logging

```tsx
console.log('[v0] Component rendered:', props);
console.log('[v0] Filtered complaints:', filteredAndSorted);
console.log('[v0] Saving complaint:', formData);
```

### React DevTools

- Check component state
- Monitor re-renders
- Profile performance

### Browser DevTools

- Check network requests (when using API)
- Monitor console for errors
- Check responsive design

---

## Best Practices

✅ **Do**:
- Use TypeScript types
- Component composition
- Memoization for performance
- Proper error handling
- Responsive design first
- Accessible HTML
- Meaningful variable names

❌ **Don't**:
- Global state for everything
- Inline functions in renders
- Complex nested components
- Hard-coded values
- Ignoring TypeScript errors
- Mixing concerns in components

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Shadcn/ui**: https://ui.shadcn.com
- **Recharts**: https://recharts.org
- **TypeScript**: https://typescriptlang.org

---

**Happy coding! Feel free to explore and modify the codebase.** 🚀
