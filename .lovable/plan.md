

## Plan: Apply Compact Mobile Styling to All Remaining Pages

### Overview
Apply consistent compact mobile styling across all remaining pages in the application to match the pattern already implemented in Doctors, Distributors, Pharmacies, Orders, Products, Targets, Reporting, DailyWorking, and Dashboard pages.

### Styling Pattern Reference
| Element | Mobile | Desktop |
|---------|--------|---------|
| Container padding | `px-3 py-2` | `md:p-6` |
| Container spacing | `space-y-3` | `md:space-y-6` |
| Card padding | `p-3` | `md:p-6` |
| Card header padding | `p-3 pb-2` | `md:p-6 md:pb-3` |
| Button size | `size="sm" h-9` | `md:h-10` |
| Button text | `text-xs` | `md:text-sm` |
| Icons (small) | `h-3.5 w-3.5` | `md:h-4 md:w-4` |
| Icons (medium) | `h-4 w-4` | `md:h-5 md:w-5` |
| Title text | `text-sm` | `md:text-lg` |
| Body text | `text-xs` | `md:text-sm` |
| Grid gaps | `gap-2.5` | `md:gap-4` |
| Search input | `pl-8 h-9 text-sm` | `md:pl-10 md:h-10` |
| Table headers/cells | `text-xs py-2` | `md:text-sm md:py-4` |
| Select triggers | `h-9 text-sm` | `md:h-10` |
| Labels | `text-xs` | `md:text-sm` |

---

### Files to Modify

#### 1. ExpensesReports.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Grand Total Card: `p-3 md:p-6`, smaller text sizes
- Filter Card: `p-3 md:p-6`, labels `text-xs md:text-sm`
- Summary Cards: `p-3 md:p-6`, grid `gap-2 md:gap-4`
- Table: smaller fonts `text-xs md:text-sm`, reduced cell padding

---

#### 2. CallReports.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Total Calls Card: `p-3 md:p-6`, title `text-xs md:text-sm`, value `text-2xl md:text-4xl`
- Filter Card: `p-3 md:p-6`, labels `text-xs md:text-sm`
- Select triggers: `h-9 md:h-10 text-sm`
- Table: `text-xs md:text-sm` for headers/cells
- Status badges: `text-[10px] md:text-xs`

---

#### 3. MonthlyTourPlan.tsx
**Current**: `px-4 py-6 max-w-6xl`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-6`
- Today's Plan Card: `mb-4 md:mb-6`, CardHeader `pb-2 md:pb-3`
- CardTitle: `text-base md:text-lg`
- Header Section: `p-4 md:p-6 mb-4 md:mb-6`
- Title text: `text-lg md:text-2xl`, `text-base md:text-lg`
- Select triggers: `h-9 md:h-10 text-sm`
- Buttons: scaled padding, `text-sm md:text-base`
- Status messages: `px-3 py-2 md:px-4 md:py-3`, `text-xs md:text-sm`
- Calendar Grid: `gap-2 md:gap-3`, cards `p-2 md:p-3 min-h-[100px] md:min-h-[120px]`
- Calendar day text: `text-xs md:text-sm`

---

#### 4. Expenses.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Action buttons: `size="sm" h-9 md:h-10 text-xs md:text-sm`
- Button icons: `h-3.5 w-3.5 md:h-4 md:w-4`
- Form Card: `p-3 md:p-6`, CardTitle `text-base md:text-lg`
- Form labels: `text-xs md:text-sm`
- Input/Select heights: `h-9 md:h-10`
- Expense Cards: `p-3 md:p-6`, title icons `h-4 w-4 md:h-5 md:w-5`
- Card title: `text-sm md:text-lg`
- Info grid: `gap-2 md:gap-4`, text `text-xs md:text-sm`
- Approval buttons: `size="sm" text-xs md:text-sm`

---

#### 5. AreaDoctorVisits.tsx
**Current**: `px-4 py-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-6 space-y-3 md:space-y-6`
- Tabs: TabsTrigger `text-xs md:text-sm`
- AssignmentForm Card: `p-3 md:p-6`, labels `text-xs md:text-sm`
- Area checkboxes: `p-1.5 md:p-2`
- Search input: `pl-8 md:pl-10 h-9 md:h-10 text-sm`
- Doctor list: reduced padding, `text-xs md:text-sm`
- Save button: `h-9 md:h-10 text-sm md:text-base`
- AssignmentsList: Collapsible items `p-3 md:p-4`
- Icons: `h-4 w-4 md:h-5 md:w-5`

---

#### 6. AddSample.tsx
**Current**: `px-4 py-8 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-8 space-y-3 md:space-y-6`
- Card padding: `p-3 md:p-6`
- CardTitle: `text-base md:text-lg`, icons `h-4 w-4 md:h-5 md:w-5`
- Form labels: `text-xs md:text-sm`
- Select/Input: `h-9 md:h-10 text-sm`
- Submit button: `size="sm" h-9 md:h-10 text-xs md:text-sm`
- Table: `text-xs md:text-sm` headers/cells
- Empty state icon: `h-8 w-8 md:h-12 md:w-12`

---

#### 7. AttachDoctorPharmacy.tsx
**Current**: `px-4 py-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-6 space-y-3 md:space-y-6`
- Cards: `p-3 md:p-6`, CardHeader `pb-2 md:pb-3`
- CardTitle: `text-base md:text-lg`
- Select triggers: `h-9 md:h-10 text-sm`
- Selected doctor card: `py-3 md:py-4`
- Search input: `pl-8 md:pl-10 h-9 md:h-10 text-sm`
- Pharmacy list items: `p-2 md:p-3`
- Text: name `text-sm md:text-base`, details `text-xs md:text-sm`
- Save button: `h-10 md:h-12 text-sm md:text-lg`

---

#### 8. WorkingAreas.tsx
**Current**: `px-4 py-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-6 space-y-3 md:space-y-6`
- Back button: `size="sm" mb-2 md:mb-4`
- Summary Cards: grid `gap-2 md:gap-4`, `p-3 md:p-4`
- Card icons: `h-4 w-4 md:h-5 md:w-5`
- Card values: `text-xl md:text-2xl`
- Filter Card: `p-3 md:p-6`
- Search input: `pl-8 md:pl-10 h-9 md:h-10 text-sm`
- Table: headers/cells `text-xs md:text-sm py-2 md:py-4`
- Action buttons: `size="sm"`, icons `h-3.5 w-3.5 md:h-4 md:w-4`
- Dialog content: tighter spacing on mobile

---

#### 9. TourPlanRequests.tsx
**Current**: `px-4 py-6`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-6`
- Table container: responsive overflow
- Table headers/cells: `text-xs md:text-sm py-2 md:py-4`
- User name: `text-sm md:text-base`
- User email: `text-[10px] md:text-xs`
- Action buttons: `size="sm" text-xs md:text-sm`
- Dialog: reduced padding on mobile

---

#### 10. DoctorDetails.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Main Card: header padding `p-3 md:p-6`
- User icon container: `p-2 md:p-3`, icon `h-6 w-6 md:h-8 md:w-8`
- Doctor name: `text-xl md:text-2xl`
- Back button: `size="sm" h-9 md:h-10 text-xs md:text-sm`
- Info grid: `gap-3 md:gap-4`
- Info icons: `h-4 w-4 md:h-5 md:w-5`
- Info text: `text-xs md:text-sm`
- Tags section: badge `text-[10px] md:text-xs`
- Incentive card: icon container `p-1.5 md:p-2`, icon `h-4 w-4 md:h-5 md:w-5`
- Assigned Pharmacies: `p-2 md:p-3` list items

---

#### 11. DistributorDetails.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Action buttons: `size="sm" h-9 md:h-10 text-xs md:text-sm`
- Button icons: `h-3.5 w-3.5 md:h-4 md:w-4`
- Empty state icon: `h-8 w-8 md:h-12 md:w-12`
- Table: `text-xs md:text-sm py-2 md:py-4`
- Action buttons in table: `size="sm"`, icons `h-3.5 w-3.5`

---

#### 12. DoctorIncentive.tsx
**Current**: `p-4 md:p-6 space-y-6`

**Changes**:
- Container: `px-3 py-2 md:p-6 space-y-3 md:space-y-6`
- Card: `p-3 md:p-6`
- Icon container: `p-1.5 md:p-2`, icon `h-4 w-4 md:h-5 md:w-5`
- CardTitle: `text-base md:text-lg`
- Empty text: `text-xs md:text-sm`

---

#### 13. SalesAndStocks.tsx & PrimarySales.tsx & SecondarySales.tsx
**Current**: `px-4 py-8`

**Changes** (same pattern for all):
- Container: `px-3 py-2 md:px-4 md:py-8`
- Card: `p-3 md:p-6`
- Icon container: `p-1.5 md:p-2`, icon `h-4 w-4 md:h-5 md:w-5`
- CardTitle: `text-base md:text-lg`
- Empty text: `text-xs md:text-sm`

---

#### 14. MyPerformance.tsx
**Current**: `p-4 md:p-6`

**Changes**:
- Container: `px-3 py-2 md:p-6`
- Cards: `p-6 md:p-8`
- Icon container: `p-3 md:p-4`, icon `h-10 w-10 md:h-12 md:w-12`
- Title: `text-xl md:text-2xl`
- Description: `text-xs md:text-sm`
- Button: `h-10 md:h-auto text-sm md:text-base`
- Grid gap: `gap-4 md:gap-6`

---

#### 15. Master.tsx
**Current**: `px-4 py-8`, buttons `h-28 md:h-32`

**Changes**:
- Container: `px-3 py-2 md:px-4 md:py-8`
- Grid gap: `gap-3 md:gap-6`
- Buttons: `h-24 md:h-32`
- Button icons: `h-6 w-6 md:h-8 md:w-8`
- Button text: `text-xs md:text-base`

---

### Summary Table

| File | Status |
|------|--------|
| `ExpensesReports.tsx` | To update |
| `CallReports.tsx` | To update |
| `MonthlyTourPlan.tsx` | To update |
| `Expenses.tsx` | To update |
| `AreaDoctorVisits.tsx` | To update |
| `AddSample.tsx` | To update |
| `AttachDoctorPharmacy.tsx` | To update |
| `WorkingAreas.tsx` | To update |
| `TourPlanRequests.tsx` | To update |
| `DoctorDetails.tsx` | To update |
| `DistributorDetails.tsx` | To update |
| `DoctorIncentive.tsx` | To update |
| `SalesAndStocks.tsx` | To update |
| `PrimarySales.tsx` | To update |
| `SecondarySales.tsx` | To update |
| `MyPerformance.tsx` | To update |
| `Master.tsx` | To update |

### Expected Result
All pages will have consistent compact mobile styling with:
- Reduced padding and margins on mobile
- Smaller fonts (text-xs/text-sm) scaling up on desktop
- Compact icons and buttons
- Tighter grid gaps
- Better information density on small screens
- Professional, consistent look across the entire application

