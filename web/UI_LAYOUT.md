# Dashboard UI Layout Reference

## Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     HEADER SECTION                          │
│  Complaint Management Dashboard                [Refresh]    │
│  Track and resolve complaints from mobile app              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD STATS (KPI CARDS)                    │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │ Total   │ │ Open    │ │ In Prog │ │ Resolved│ │ Resolut │
│  │  12     │ │  4 (R)  │ │  4 (Y)  │ │  4 (G)  │ │ Rate 33%│
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
│                                                             │
│  Stats show in 1 row (mobile: stacked, desktop: 5 cols)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ANALYTICS CHARTS SECTION                       │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  SEVERITY PIE    │  │  STATUS PIE      │                │
│  │  HIGH: 4 (R)     │  │  OPEN: 4 (R)     │                │
│  │  MOD:  4 (Y)     │  │  PROG: 4 (B)     │                │
│  │  LOW:  4 (G)     │  │  RES:  4 (G)     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │      7-DAY TREND CHART               │                  │
│  │      (Line graph showing daily       │                  │
│  │       complaint volume)              │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  Charts layout: 2x1 on desktop, 1x3 on mobile              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          COMPLAINTS TABLE SECTION                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Complaints Management                                 │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Search: [_________________]                         │  │
│  │  Severity: [All Severities ▼]                        │  │
│  │  Status:   [All Status      ▼]                       │  │
│  │                                                       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ ID │ Title          │ Severity │ Status      │ User  │  │
│  ├────┼────────────────┼──────────┼─────────────┼───────┤  │
│  │ #1 │ App crashes    │ HIGH(R)  │ IN_PROG(B)  │ Alex  │  │
│  │    │                │          │             │ T...  │  │
│  │ #2 │ Payment issue  │ HIGH(R)  │ OPEN(R)     │ Maria │  │
│  │    │                │          │             │ G...  │  │
│  │ #3 │ UI misaligned  │ MOD(Y)   │ IN_PROG(B)  │ David │  │
│  │    │                │          │             │ L...  │  │
│  │    │ ... more rows  │          │             │       │  │
│  │    │ (scrollable)   │          │             │       │  │
│  │    │                │          │             │       │  │
│  │ #12│ App force closes│HIGH(R)  │ IN_PROG(B)  │ Laura │  │
│  │    │                │          │             │ J...  │  │
│  ├────┴────────────────┴──────────┴─────────────┴───────┤  │
│  │ [Resolve] [Resolve] [Resolve] ... [Resolve]         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Table is fully responsive with horizontal scroll         │
└─────────────────────────────────────────────────────────────┘
```

## Modal/Dialog Layout

```
┌─────────────────────────────────────────────┐
│ Resolve Complaint #1                    [X] │
├─────────────────────────────────────────────┤
│                                             │
│  COMPLAINT DETAILS (Read-Only)             │
│  ┌─────────────────────────────────────┐   │
│  │ Title: App crashes on login        │   │
│  │ Description: The application...    │   │
│  │ Category: Technical Issue          │   │
│  │ Reported By: Alex Thompson         │   │
│  │              user1@example.com     │   │
│  │ Reported Date: 03/05/2025          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  STATUS UPDATE                             │
│  ┌──────────────┐ ┌──────────────────┐    │
│  │ Status       │ │ Severity         │    │
│  │ [IN_PROG ▼]  │ │ [HIGH          ▼]│    │
│  └──────────────┘ └──────────────────┘    │
│                                             │
│  ASSIGNMENT                                │
│  ┌──────────────┐ ┌──────────────────┐    │
│  │ Assign To    │ │ Deadline         │    │
│  │ [John Doe ▼] │ │ [2025-03-07 ▼]   │    │
│  └──────────────┘ └──────────────────┘    │
│                                             │
│  RESOLUTION NOTES                          │
│  ┌─────────────────────────────────────┐   │
│  │ [Type resolution notes here...]     │   │
│  │                                     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ [Cancel]     │  │ [Save Changes]   │   │
│  └──────────────┘  └──────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
(Overlay covers entire page with semi-transparent background)
```

## Component Breakdown

### 1. Header Component
```
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────┐  ┌──────────────────┐   │
│ │ Title               │  │ [Refresh] Button │   │
│ │ Subtitle            │  │                  │   │
│ └─────────────────────┘  └──────────────────┘   │
│ Fixed at top with border-bottom                 │
└─────────────────────────────────────────────────┘
```

### 2. DashboardStats Component
```
Desktop (5 columns):
┌─────┬─────┬─────┬─────┬─────┐
│ 1   │ 2   │ 3   │ 4   │ 5   │
└─────┴─────┴─────┴─────┴─────┘

Tablet (2-3 columns):
┌─────┬─────┐
│ 1   │ 2   │
├─────┼─────┤
│ 3   │ 4   │
├─────┴─────┤
│     5     │
└───────────┘

Mobile (1 column):
┌─────┐
│ 1   │
├─────┤
│ 2   │
├─────┤
│ 3   │
├─────┤
│ 4   │
├─────┤
│ 5   │
└─────┘
```

### 3. AnalyticsCharts Component
```
Desktop (3 columns):
┌──────┬──────┬──────┐
│ PIE1 │ PIE2 │ LINE │
└──────┴──────┴──────┘

Tablet (2x2):
┌──────┬──────┐
│ PIE1 │ PIE2 │
├──────┴──────┤
│    LINE     │
└─────────────┘

Mobile (1 column):
┌──────┐
│ PIE1 │
├──────┤
│ PIE2 │
├──────┤
│ LINE │
└──────┘
```

### 4. ComplaintsTable Component
```
Filter Row:
┌─────────────────┬────────────────┬────────────────┐
│ Search Input    │ Severity Filter│ Status Filter  │
└─────────────────┴────────────────┴────────────────┘

Table Header:
┌────┬──────────┬──────────┬────────┬────────┬─────────┬───────┐
│ ID │ Title    │ Severity │ Status │ User   │ Reported│Action │
└────┴──────────┴──────────┴────────┴────────┴─────────┴───────┘

Table Rows (Repeating):
│ #N │ Title... │ HIGH(R)  │ OPEN   │ Name   │ Date    │[Resolve]
└────┴──────────┴──────────┴────────┴────────┴─────────┴───────┘

Mobile (Card View on smaller screens)
```

## Color Indicators

### Severity Badges
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  HIGH        │  │  MODERATE    │  │  LOW         │
│ (Red)        │  │  (Orange)    │  │  (Green)     │
│ #dc2626      │  │  #f59e0b     │  │  #10b981     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Status Badges
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  OPEN        │  │ IN_PROGRESS  │  │  RESOLVED    │
│  (Red)       │  │  (Blue)      │  │  (Green)     │
│  #ef4444     │  │  #3b82f6     │  │  #22c55e     │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Responsive Breakpoints

```
Mobile      (<640px)   - Single column, stacked layout
Tablet      (640-1024) - 2-column grid, compact spacing
Desktop     (>1024px)  - Full width, multi-column layouts
```

## Interactive Elements

### Buttons
```
Primary:   [Save Changes] - Solid background
Secondary: [Cancel]       - Outline style
Tertiary:  [Resolve]      - Compact button
Refresh:   [Refresh Data] - Header button
```

### Form Controls
```
Text Input:     [Search box...]
Dropdown:       [Select Option ▼]
DateTime Input: [2025-03-07 ▼]
Text Area:      [Multi-line input...]
```

### Badges
```
Severity:  Pill-shaped with background color
Status:    Pill-shaped with background color
Both:      Padded, rounded, bold text
```

## Spacing & Padding

```
Page Margins:    px-4 (sm), px-6 (md), px-8 (lg)
Max Width:       max-w-7xl (1280px)
Section Spacing: mb-8 between major sections
Card Padding:    p-4 to p-6
Gap Between Cards: gap-4 to gap-6
```

---

**All layouts are built with Tailwind CSS and are fully responsive**
