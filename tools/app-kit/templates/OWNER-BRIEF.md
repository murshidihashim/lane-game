# Owner brief · try, check and publish {{APP}}

Everything here should work from a phone.

## The copies
| Copy | Address | Who changes it |
|---|---|---|
| Preview | <preview URL> | Updated automatically after a change passes all checks |
| Live (users) | <live URL> | Only you, with the publish step below |

## 1 · Try a change
1. Claude says a change is ready and the checks are green.
2. Open the preview on your phone (refresh if it looks old) and follow the checklist.

## 2 · Checklist (about 10 minutes)
Write down what you **saw**, not just "it's fine".
- [ ] It opens and the first screen makes sense.
- [ ] You can finish the core task from start to end.
- [ ] Leave the app and come back: your work is still there.
- [ ] Turn the phone sideways and back: nothing is cut off.
- [ ] Anything confusing, slow or ugly: note the screen.

Send bugs with: build or URL, device and browser, steps, expected, actual, how often, screenshot.

## 3 · What the checks mean
Green checks prove the automated tests passed. They do not prove the app is clear, pleasant, or
works on your real phone. Results are always PASS, FAIL, NOT RUN or NOT APPLICABLE.

## 4 · Publish (only when you decide)
1. Say "PREPARE RELEASE". Claude writes the version and user notes.
2. Run the publish step: <how>.
3. Tell Claude "Published <version>" so the records show what users have.
