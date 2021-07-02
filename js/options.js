// In-page cache of the user's options
const options = {};

// Initialize the form with the user's option settings
chrome.storage.sync.get('options', (data) => {
  Object.assign(options, data.options);
  optionsForm.textKey.value = options.textKey;
});

// Immediately persist options changes
optionsForm.textKey.addEventListener('change', (event) => {
  options.textKey = event.target.value;
  chrome.storage.sync.set({options});
});