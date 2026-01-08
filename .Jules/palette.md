## 2024-05-23 - Pagination Accessibility
**Learning:** Numbered pagination buttons (1, 2, 3) are ambiguous for screen readers without `aria-label` and `aria-current`. Users might hear just "button 1" which doesn't indicate it's a page number or the current page.
**Action:** Always add `aria-label="Go to page X"` and `aria-current="page"` to pagination controls.
