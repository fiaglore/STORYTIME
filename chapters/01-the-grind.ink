// STORYTIME: Lagos — Chapter 1: The Grind
// Protagonist: Mama Ngozi, akara seller, Mushin to Oshodi
// A single working day, 3:45 AM to 2:15 PM.

VAR naira = 50
VAR spirit = 60
VAR profit = 0
VAR solidarity = 0
VAR batches = 0
VAR chidinma_told = "none"
VAR ngozi_outcome = ""

-> opening

=== opening ===
# stage: ngozi@stall
3:45 AM. Mushin never sleeps — and neither does Mama Ngozi.
-> prepare

=== prepare ===
# stage: ngozi@stall
# scene: frying
The beans are ready. How much do you fry today?
+ [Fry a small batch — safer, keep your strength]
    ~ batches = 2
    ~ profit += 10
    Small and steady.
    -> commute
+ [Fry a standard batch — the usual grind]
    ~ batches = 3
    ~ profit += 18
    ~ spirit -= 2
    You fall into the rhythm you know.
    -> commute
+ [Fry a big batch — go for broke]
    ~ batches = 4
    ~ profit += 28
    ~ spirit -= 5
    You load the pan heavy.
    -> commute

=== commute ===
# stage: ngozi@stall
Go-slow on the road to Oshodi, as always.
* [Take the long way round, through the back streets]
    ~ profit -= 2
    Longer, but moving.
    -> morning_rush
* [Pay an okada to weave through the go-slow]
    ~ naira -= 5
    Five hundred naira gone before the first sale.
    -> morning_rush

=== morning_rush ===
# stage: ngozi@stall
Oshodi wakes up loud. "Mama Ngozi! Abeg!"
By eight, your tray is {batches >= 4: already half gone} {batches == 3: moving steadily} {batches <= 2: lighter than you'd like}.
-> help_traders

=== help_traders ===
# stage: trader@stall
Jagaban's boys move through the market, notebook in hand.
-> help_tailor

=== help_tailor ===
# stage: trader@stall
Baba Issa the tailor is short on his dues.
+ [Stand beside Baba Issa while he talks to them]
    ~ naira -= 3
    ~ solidarity += 1
    The boys move on. Baba Issa grips your hand.
    -> help_okra
+ [Keep frying — your tray will not sell itself]
    Not your trouble today.
    -> help_okra

=== help_okra ===
# stage: trader@stall
Aisha counts coins, short of what they're asking.
+ [Lend Aisha what she is short]
    ~ naira -= 5
    ~ solidarity += 1
    "I go pay you back," she says.
    -> help_mallam
+ [Let Aisha handle her own matter]
    You have your own ₦500 to find.
    -> help_mallam

=== help_mallam ===
# stage: trader@stall
Old Mallam Sule stands his ground, arms folded.
+ [Walk over and stand with him, saying nothing]
    ~ solidarity += 1
    The boys decide the paperwork can wait.
    -> jagaban_visit
+ [Watch from your stall]
    Something in you feels the distance.
    -> jagaban_visit

=== jagaban_visit ===
# stage: jagaban@stall
"Mama Ngozi." Jagaban says your name like he owns it. "Levy don increase small. Five hundred naira, two o'clock."
-> chidinma_call

=== chidinma_call ===
# stage: ngozi@stall
Your phone rings. Chidinma — JAMB form money, due Friday.
* ["Don't worry, I will find it. I promise."]
    ~ chidinma_told = "promise"
    ~ spirit -= 2
    The lie costs nothing today.
    -> afternoon
* ["Things are tight right now. Give me till the weekend."]
    ~ chidinma_told = "truth"
    ~ spirit += 2
    She goes quiet, doing the same math as you.
    -> afternoon
* ["Call your father. I cannot carry this one alone."]
    ~ chidinma_told = "father"
    "You know how he is," she says.
    -> afternoon

=== afternoon ===
# stage: ngozi@stall
# scene: changemaking
Lunch rush, forty minutes before two o'clock finds you.
-> confrontation

=== confrontation ===
# stage: jagaban@confrontation
Two o'clock. Jagaban arrives, notebook open. "So, Mama? Your five hundred naira ready?"
+ [Pay the ₦500]
    ~ naira -= 30
    ~ spirit -= 20
    ~ profit -= 30
    ~ ngozi_outcome = "paid_in_full"
    You count the notes into his hand.
    -> ending_paid_in_full
+ [Stand on your dignity and refuse]
    ~ spirit += 20
    ~ ngozi_outcome = "as_written"
    "I no go pay another man wey just wake up yesterday."
    -> ending_as_written
+ {solidarity >= 3} [Call the traders to stand with you]
    ~ spirit += 15
    ~ naira += 5
    ~ ngozi_outcome = "market_stands"
    "Baba Issa! Aisha! Mallam Sule!" The row answers.
    -> ending_market_stands
+ [Pack up quietly and leave for Mile 12 before he reaches you]
    ~ naira -= 10
    ~ ngozi_outcome = "mile_12"
    You fold your tray before he's three stalls away.
    -> ending_mile_12

=== ending_paid_in_full ===
# stage: ngozi@confrontation
# ending_id: paid_in_full
# ending: Paid in Full
# verdict: Kept her body, lost Chidinma's JAMB money and her pride
The form will wait. You walk home lighter, nothing won.
-> END

=== ending_as_written ===
# stage: jagaban@confrontation
# ending_id: as_written
# ending: The Akara on the Ground
# verdict: Kept her Spirit, lost everything else — she collapses; her survival is revealed in Danfo Diaries
# book_canon
Jagaban's hand moves before you finish your sentence. The tray goes over. The market goes silent.
-> END

=== ending_market_stands ===
# stage: ngozi-defiant@confrontation
# ending_id: market_stands
# ending: The Market Stands
# verdict: Kept both, for today — Jagaban promises to return
The row holds. "We go see," Jagaban says — not a retreat, only a postponement.
-> END

=== ending_mile_12 ===
# stage: ngozi@stall
# ending_id: mile_12
# ending: Mile 12
# verdict: Kept her safety, lost her customers and her spot
A corner in Mile 12 by evening. Safe tonight. That has to be worth something.
-> END
