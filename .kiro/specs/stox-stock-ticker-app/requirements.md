# Requirements Document

## Introduction

Stox is a single-page web application built with React, TypeScript, Node, and TanStack Query. It displays a live, scrollable list of stock tickers with key financial metrics sourced from Google Finance. Users can view up-to-date pricing, valuation, and fundamental data for a configurable set of tickers in a tabular layout.

## Glossary

- **Stox**: The name of the single-page web application being built.
- **Ticker**: A stock symbol (e.g., AAPL, MSFT) used to identify a publicly traded company.
- **Stock_Row**: A single row in the ticker table representing one stock's data.
- **Ticker_Table**: The main UI component that renders all Stock_Rows in a tabular format.
- **Data_Fetcher**: The TanStack Query-based service responsible for retrieving stock data from Google Finance.
- **Google_Finance**: The external data source used to retrieve up-to-date stock information.
- **EPS**: Earnings Per Share — net income divided by outstanding shares.
- **Book_Value**: Total assets minus total liabilities, representing net asset value per share.
- **Tangible_Book_Value**: Book value excluding intangible assets and goodwill.
- **P_Book**: Price-to-Book ratio — current share price divided by Book Value per share.
- **P_Tangbook**: Price-to-Tangible-Book ratio — current share price divided by Tangible Book Value per share.
- **Dividend_Yield**: Annual dividend payment divided by current share price, expressed as a percentage.
- **Dividend_Percent**: The dividend payout as a percentage of earnings.
- **20x_EPS**: A valuation estimate calculated as 20 multiplied by EPS.
- **15x_EPS**: A valuation estimate calculated as 15 multiplied by EPS.
- **Price_Earnings**: Price-to-Earnings ratio — current share price divided by EPS.
- **Interest**: A user-defined annotation field for investment intent (e.g., "BUY", "WATCH").
- **Net_Liabilities**: Total liabilities of the company.
- **Shares_Outstanding**: Total common shares outstanding.

---

## Requirements

### Requirement 1: Project Setup

**User Story:** As a developer, I want a Node/React/TypeScript project scaffold, so that I can build and run the Stox app locally.

#### Acceptance Criteria

1. THE Stox SHALL be implemented as a Node package project using React, TypeScript, and TanStack Query.
2. THE Stox SHALL be a single-page web application with no server-side routing.
3. THE Stox SHALL include a `package.json` with all required dependencies declared.
4. THE Stox SHALL be initialized as a Git repository with a `.gitignore` appropriate for a Node/React project.

---

### Requirement 2: Ticker Table Display

**User Story:** As a user, I want to see a table of stock tickers with financial data, so that I can quickly compare key metrics across multiple stocks.

#### Acceptance Criteria

1. THE Ticker_Table SHALL display one Stock_Row per configured ticker symbol.
2. THE Ticker_Table SHALL render the following columns for each Stock_Row in this order:
   - Ticker
   - Price
   - Date
   - Div Yield
   - EPS
   - Total Assets
   - Goodwill, Net
   - Intangibles, Net
   - Liabilities (Total)
   - Shares (Total Common Outstanding)
   - Book Value
   - P:Book
   - Tangable Book Value
   - P:Tangbook
   - Dividend Percent
   - 20x EPS
   - 15x EPS
   - Price/Earnings
   - Interest
3. THE Ticker_Table SHALL display column headers matching the names listed in criterion 2.
4. THE Ticker_Table SHALL render all columns in a horizontally scrollable container when the viewport width is insufficient to display all columns.

---

### Requirement 3: Stock Data Retrieval

**User Story:** As a user, I want the app to fetch up-to-date stock data from Google Finance, so that the information I see reflects current market conditions.

#### Acceptance Criteria

1. WHEN the application loads, THE Data_Fetcher SHALL retrieve stock data for all configured ticker symbols from Google Finance.
2. WHEN a fetch request succeeds, THE Data_Fetcher SHALL populate each Stock_Row with the returned financial data.
3. WHEN a fetch request fails, THE Data_Fetcher SHALL display an error indicator in the affected Stock_Row without crashing the application.
4. THE Data_Fetcher SHALL use TanStack Query to manage fetch state, caching, and background refresh.
5. WHILE data is being fetched, THE Ticker_Table SHALL display a loading indicator in place of the data.

---

### Requirement 4: Computed Columns

**User Story:** As a user, I want derived metrics calculated automatically, so that I don't have to compute them manually.

#### Acceptance Criteria

1. WHEN stock data is available, THE Stock_Row SHALL compute P:Book Value as the current Price divided by Book Value per share.
2. WHEN stock data is available, THE Stock_Row SHALL compute Tangible Book Value as Book Value minus Goodwill minus Net Intangibles.
3. WHEN stock data is available, THE Stock_Row SHALL compute P:Tangbook as the current Price divided by Tangible Book Value per share.
4. WHEN stock data is available, THE Stock_Row SHALL compute 20x EPS as 20 multiplied by EPS.
5. WHEN stock data is available, THE Stock_Row SHALL compute 15x EPS as 15 multiplied by EPS.
6. WHEN stock data is available, THE Stock_Row SHALL compute Price/Earnings as the current Price divided by EPS.
7. IF Book Value per share is zero or unavailable, THEN THE Stock_Row SHALL display "N/A" for P:Book.
8. IF Tangable Book Value is zero or unavailable, THEN THE Stock_Row SHALL display "N/A" for P:Tangbook.
9. IF EPS is zero or unavailable, THEN THE Stock_Row SHALL display "N/A" for Price/Earnings.

---

### Requirement 5: Ticker Configuration

**User Story:** As a user, I want to configure which tickers are displayed, so that I can track the stocks I care about.

#### Acceptance Criteria

1. THE Stox SHALL read the list of ticker symbols to display from a configurable source (e.g., a config file or environment variable).
2. WHEN the ticker list is updated and the application is reloaded, THE Ticker_Table SHALL reflect the updated list of tickers.
3. IF no tickers are configured, THEN THE Ticker_Table SHALL display an empty state message indicating no tickers are configured.

---

### Requirement 6: Data Freshness

**User Story:** As a user, I want the data to stay reasonably current while I have the app open, so that I see recent market information.

#### Acceptance Criteria

1. THE Data_Fetcher SHALL automatically refresh stock data at a configurable interval, with a default of 60 seconds.
2. WHEN a refresh is in progress, THE Ticker_Table SHALL continue displaying the last successfully fetched data.
3. THE Ticker_Table SHALL display the timestamp of the most recent successful data fetch for each Stock_Row in the Date column.

---

### Requirement 7: Number Formatting

**User Story:** As a user, I want financial figures displayed in a readable format, so that I can interpret values at a glance.

#### Acceptance Criteria

1. THE Stock_Row SHALL display monetary values (Price, Book Value, Tangable Book Value, Total Assets, Goodwill, Net Intangibles, Liabilities) formatted with a currency symbol and two decimal places.
2. THE Stock_Row SHALL display ratio values (P:Book, P:Tangbook, Price/Earnings) formatted to two decimal places.
3. THE Stock_Row SHALL display percentage values (Div Yield, Dividend Percent) formatted with a "%" suffix and two decimal places.
4. THE Stock_Row SHALL display large numeric values (Total Assets, Liabilities, Shares Outstanding) using abbreviated suffixes (K, M, B, T) for readability.
5. WHEN a value is unavailable or results in a division by zero, THE Stock_Row SHALL display "N/A" for that cell.
6. THE Stock_Row SHALL display negative monetary and ratio values using parentheses notation (e.g., `($6.51)` or `(181.70)`).

---

### Requirement 8: Persist Ticker List to Local Storage

**User Story:** As a user, I want my ticker list saved to local storage, so that my configured tickers are preserved across browser sessions without needing to reconfigure them each time.

#### Acceptance Criteria

1. WHEN the user modifies the ticker list, THE Stox SHALL save the updated list of ticker symbols to browser local storage.
2. WHEN the application loads, THE Stox SHALL read the ticker list from browser local storage and populate the Ticker_Table with the stored symbols.
3. IF no ticker list is found in browser local storage, THEN THE Stox SHALL fall back to an empty ticker list and display the empty state message.
4. WHEN the ticker list in local storage is updated, THE Ticker_Table SHALL reflect the changes without requiring a full page reload.

---

### Requirement 9: Export Data as CSV

**User Story:** As a user, I want to download the currently displayed stock ticker data as a CSV file, so that I can analyze or share the data outside of the application.

#### Acceptance Criteria

1. THE Ticker_Table SHALL display a download button that triggers a CSV export of the currently displayed stock data.
2. WHEN the user activates the download button, THE Stox SHALL generate a CSV file containing a header row with all 19 column names in the same order defined in Requirement 2, criterion 2.
3. WHEN the user activates the download button, THE Stox SHALL include one row per Stock_Row in the CSV, with each cell corresponding to the displayed value for that column.
4. WHEN the user activates the download button, THE Stox SHALL name the exported file using the format `stox-export-{timestamp}.csv`, where `{timestamp}` is the current date and time in ISO 8601 format.
5. IF no stock data is currently loaded, THEN THE Stox SHALL disable the download button and display a tooltip indicating there is no data to export.

---

### Requirement 10: Search, Sort, and Filter

**User Story:** As a user, I want to search, sort, and filter the ticker list by column values, so that I can quickly find and compare the stocks I care about.

#### Acceptance Criteria

1. THE Ticker_Table SHALL display a global text input that filters visible Stock_Rows to those whose Ticker symbol contains the entered string (case-insensitive).
2. WHEN the user clicks a column header, THE Ticker_Table SHALL sort all visible Stock_Rows by that column in ascending order.
3. WHEN the user clicks the same column header a second time, THE Ticker_Table SHALL toggle the sort direction to descending.
4. THE Ticker_Table SHALL display a visual indicator on the active sort column header showing the current sort direction (ascending or descending).
5. WHEN sorting a numeric column (Price, EPS, Book Value, P:Book, Tangable Book Value, P:Tangbook, Div Yield, Dividend Percent, 20x EPS, 15x EPS, Price/Earnings, Total Assets, Goodwill, Net Intangibles, Liabilities, Shares Outstanding), THE Ticker_Table SHALL sort rows numerically.
6. WHEN sorting a text column (Ticker, Date), THE Ticker_Table SHALL sort rows alphabetically.
7. WHEN the user applies a search filter or sort, THE Stox SHALL not modify the underlying stored ticker list, only the current rendered view.

---

### Requirement 11: Add and Remove Tickers

**User Story:** As a user, I want to add and remove individual stock tickers from the list, so that I can manage which stocks I track without editing a config file.

#### Acceptance Criteria

1. THE Ticker_Table SHALL display a text input and a submit button that allows the user to enter a new ticker symbol and add it to the list.
2. WHEN the user submits a new ticker, IF the entered value is an empty string, THEN THE Stox SHALL not add the ticker and SHALL display a validation message indicating the ticker symbol cannot be empty.
3. WHEN the user submits a new ticker whose symbol already exists in the ticker list, THE Stox SHALL not add the duplicate and SHALL display a message indicating the ticker is already in the list.
4. THE Ticker_Table SHALL display a remove control on each Stock_Row that allows the user to delete that ticker from the list.
5. WHEN a ticker is added or removed, THE Stox SHALL persist the updated ticker list to browser local storage as defined in Requirement 8.
6. WHEN the user activates the remove control for a Stock_Row, THE Ticker_Table SHALL remove that Stock_Row from the display immediately.

---

### Requirement 12: Interest/Annotation Column

**User Story:** As a user, I want to annotate each stock row with a short note (e.g., "BUY", "WATCH"), so that I can track my investment intent for each ticker.

#### Acceptance Criteria

1. THE Stock_Row SHALL display an editable Interest field in the Interest column.
2. THE Interest field SHALL accept free-text input of any string value.
3. WHEN the user edits the Interest field, THE Stox SHALL persist the annotation alongside the ticker symbol in browser local storage.
4. THE Interest column SHALL be included in CSV exports as defined in Requirement 9.
