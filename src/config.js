export const CONFIG = {
    // Cap for typeahead-style searches (free text, @user) where a tight result set is fine.
    MAX_RESULTS: 10,
    // Cap for fetching a specific, already-known set of issues (open tabs + favorites) -
    // there's no reason to truncate this as tightly as a live search, since it's not a
    // "top N of many possible matches" query, it's "give me back these particular issues".
    MAX_KNOWN_ISSUES: 50
};