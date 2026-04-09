// ══════════════════════════════════════════════════════════════
// Traffic Splitter v1.0
// ══════════════════════════════════════════════════════════════
// Add this script to <head> right AFTER the __landerConfig block.
// It reads test_id from __landerConfig, fetches the test config,
// and redirects to the assigned variant based on traffic weights.
//
// Only runs on the entry variant (id "a"). Other variants are
// never redirected. A 24-hour cookie keeps visitors sticky to
// their assigned variant.
//
// Usage in HTML:
//   <script>window.__landerConfig = { ... test_id: "kbh_a" ... };</script>
//   <script src="/splitter.js"></script>
//
// Or inline the contents of this file in a <script> tag.
// ══════════════════════════════════════════════════════════════
(function () {
  try {
    var c = window.__landerConfig;
    if (!c || !c.test_id) return;

    // Parse test name and variant id from test_id (e.g. "kbh_a" → "kbh", "a")
    var p = c.test_id.lastIndexOf('_');
    if (p < 1) return;
    var testName = c.test_id.substring(0, p);
    var varId = c.test_id.substring(p + 1);

    // Only the entry variant (a) runs the splitter
    if (varId !== 'a') return;

    // Check for sticky cookie
    var ck = 'ts_' + testName;
    var m = document.cookie.match(new RegExp('(?:^|; )' + ck + '=([^;]+)'));

    // If cookie says this visitor belongs on variant a, stay put
    if (m && m[1] === varId) return;

    // Hide page to prevent flash during async redirect
    document.documentElement.style.visibility = 'hidden';

    var x = new XMLHttpRequest();
    x.open('GET', '/tests/' + testName + '.json', true);
    x.onload = function () {
      if (x.status !== 200) { show(); return; }
      var t;
      try { t = JSON.parse(x.responseText); } catch (e) { show(); return; }
      if (!t || t.status !== 'active' || !t.variants || t.variants.length < 2) { show(); return; }

      var target;

      // If cookie exists, honour the saved assignment
      if (m) {
        for (var i = 0; i < t.variants.length; i++) {
          if (t.variants[i].id === m[1]) { target = t.variants[i]; break; }
        }
      }

      // No cookie (or stale cookie) — roll the dice
      if (!target) {
        // Handle missing weights: default to equal split
        var hasWeights = t.variants.some(function (v) { return v.weight > 0; });
        var rand = Math.random() * 100;
        var cum = 0;

        for (var i = 0; i < t.variants.length; i++) {
          var w = hasWeights ? (t.variants[i].weight || 0) : (100 / t.variants.length);
          cum += w;
          if (rand < cum) { target = t.variants[i]; break; }
        }
        if (!target) target = t.variants[t.variants.length - 1];

        // Set sticky cookie (24 hours)
        document.cookie = ck + '=' + target.id + ';max-age=86400;path=/';
      }

      // If assigned to the current variant, stay on this page
      if (target.id === varId) { show(); return; }

      // Redirect, preserving all URL parameters and hash
      location.replace('/' + target.page + location.search + location.hash);
    };
    x.onerror = function () { show(); };
    x.send();

    function show() { document.documentElement.style.visibility = ''; }
  } catch (e) {
    // Never break the page — silently fail
    try { document.documentElement.style.visibility = ''; } catch (e2) {}
  }
})();
