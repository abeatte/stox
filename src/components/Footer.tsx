export function Footer() {
    return (<footer className="gs-footer">
        <span>
            Created by{' '}
            <a href="https://artbeatte.com" target="_blank" rel="noopener noreferrer">
                Art Beatte IV
            </a>
        </span>
        <span>|</span>
        <span>Copyright © {new Date().getFullYear()} StockWorks</span>
        <span>|</span>
        <span>All rights reserved</span>
    </footer>);
}