# User Growth Trend Graph — Admin Dashboard

## Before Writing Any Code
1. Find the existing admin dashboard 
  in the web app codebase
2. Find how user registration dates 
  are stored in the profiles or 
  auth table
3. Find what charting libraries are 
  already installed in the web app
4. Report findings before making 
  any changes

---

## Overview
Add an animated user growth trend 
graph to the existing admin dashboard 
showing cumulative user growth over 
time since launch on 1st April 2026.

---

## Graph Requirements

### Type
A smooth animated line graph showing 
cumulative total users over time.

### Data
Query the database for user 
registration dates and calculate 
cumulative user count per day 
from 1st April 2026 to today.

Group by day. Each data point 
represents the total number of 
registered users on that date.

### X Axis
Date from 1st April 2026 to today.
Format: DD MMM (e.g. 01 Apr, 15 Apr, 
01 May, 15 May etc)
Show one label per week minimum 
to avoid crowding.

### Y Axis
Total cumulative user count.
Start at 0.
Auto scale to current maximum.
Label format: whole numbers only.

### Animation
On page load the line draws itself 
from left to right smoothly over 
approximately 1.5 seconds with 
an ease out curve.

The area beneath the line fills 
with a subtle gradient matching 
SoundBridge brand colours — 
use a gradient from the platform's 
primary red/pink at higher opacity 
at the line down to transparent 
at the bottom.

### Milestone markers
Add vertical dotted reference lines 
or markers at the following 
significant milestones:

- 1st April 2026: "Launch"
- Date when 500 users was reached
- Date when 1,000 users was reached

Each marker shows a small label 
above the line at that point.

### Hover tooltip
When hovering over any point on 
the line show a tooltip displaying:

Date: [DD MMM YYYY]
Total Users: [number]
New Today: [number joined that day]

### Key stats above the graph
Show three summary stat cards 
above the graph:

Card 1: Total Users Today — [number]
Card 2: This Month — [number joined 
in current calendar month]
Card 3: Daily Average — [average 
new users per day since launch]

### Responsive
Graph must resize correctly on 
all screen sizes. On smaller screens 
reduce the number of x axis labels 
to avoid overlap.

---

## Chart Library
Use the existing charting library 
already installed in the web app. 
If no charting library exists check 
if recharts, chart.js or similar 
is available before adding a new 
dependency.

---

## Position on Dashboard
Place the user growth graph 
prominently near the top of the 
admin dashboard, below the existing 
summary metric cards and above 
other data tables.

Give it a clear section heading:
"User Growth Since Launch"

---

## Data Query
The graph data endpoint should:
- Query all user registration dates 
 from 1st April 2026 to today
- Calculate cumulative totals per day
- Return as an array of objects:
 { date: 'YYYY-MM-DD', 
   cumulative: number, 
   new_today: number }
- Cache the result for 1 hour 
 to avoid repeated heavy queries

---

## Acceptance Criteria
- [ ] Graph displays on admin dashboard
- [ ] Data loads correctly from 
     registration dates
- [ ] Cumulative user count per day 
     is accurate
- [ ] X axis dates display correctly
- [ ] Y axis scales correctly
- [ ] Line draws with animation 
     on page load
- [ ] Gradient fill beneath line 
     displays correctly
- [ ] Launch and milestone markers 
     visible
- [ ] Hover tooltip shows correct data
- [ ] Three summary stat cards display 
     above graph
- [ ] Graph is responsive on all 
     screen sizes
- [ ] Data cached for 1 hour
- [ ] No existing admin functionality 
     broken
