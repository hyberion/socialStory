# Photo letter (draft)

> **Built in the app (Nov 1)** as "📄 Letter to show staff" on the photo list, generated from the outline by `packages/core/src/photoLetter.ts`. The app version leaves out the two promises flagged below until they're true.

A note the user can print, or show on their phone, when asking to take pictures at a place their child will visit. The app will fill in the bracketed parts. Kept short on purpose: most people will read it standing at a front desk.

**Rule:** every promise here has to be true of the app. If how we handle photos changes, this letter changes first.

---

**Why I'm asking to take a few pictures**

Hi! My child, [first name or nickname], is coming here on [date] for [the visit]. New places and new people can be really hard for [him / her / them], and seeing them ahead of time helps a lot.

I'm using an app that turns a few photos into a short picture story about the visit, so [name] can read it at home and know what to expect: what the building looks like, the waiting room, and the people [he'll / she'll / they'll] meet.

**What the photos are for, and what they're not for**

- They're used only to make [name]'s story. Only our family sees it.
- They're never posted, published or shared, and never used for ads.
- The app sends them to an AI service to make the story's drawings. That service doesn't use them to train its AI.
- I can delete them at any time, and I'll gladly delete any photo you'd rather I didn't keep.

**What I'd like to photograph** (only with your OK)

- The entrance and the waiting area, without other patients or visitors in the shot
- The room [name] will be in, if that's all right
- You, only if you're comfortable with it. A photo of a name badge or a drawing works too.

It's completely fine to say no to any of this. Thank you so much for helping [name] feel ready.

[Your name] · [phone, optional]

---

## Notes before this goes in the app

- Check the "doesn't use them to train its AI" line against Meta's current terms for the standard (non-contributor) service before real families use it. It holds for how we call the API today (contributor mode is never used), but the letter shouldn't promise more than Meta does about retention.
- "I can delete them at any time" depends on the delete-everything feature (open question in the user guide notes). Build that before showing this letter to anyone.
- Offer a version for schools and therapists ("for my student" / "for my client") once the user type is known.
