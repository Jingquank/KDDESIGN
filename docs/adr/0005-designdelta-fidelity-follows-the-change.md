# DesignDelta Fidelity follows what the Change is, not Real first

Status: the Real-or-Rebuilt rule for operated Changes is superseded by ADR 0007.

The first design tried Real (the project's own code, built per commit) for every Change, falling back to Rebuilt, then Screenshot. On a product site it worked but cost most of the run: two worktree builds, a router shim, 57 mirrored media files, renamed `.gz` data, 18 live app instances on one page, and a browser check that could not finish. Most of those Changes were layout changes a still shows completely. Now each Change picks its Fidelity by what it is about: Screenshot (plus live preview links) for anything seen, Rebuilt or Real scoped to the piece for anything operated (motion, response, a 3D stage). Interactive copies stay where interaction is the point; everywhere else a picture is cheaper and cannot misrepresent the product.
