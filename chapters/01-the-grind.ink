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
Mushin never sleeps, and this morning, neither does Mama Ngozi.
Three forty-five, and the bean grinder is already singing in the dark.
-> prepare

=== prepare ===
# scene: frying
The beans soak overnight, and by now they are soft and ready. The question is simple and it is never simple: how much do you fry today?

More batches mean more akara to sell, more money by afternoon. More batches also mean more oil, more gas, more hours bent over a hot pan before the sun is even awake.
+ [Fry a small batch — safer, keep your strength]
    ~ batches = 2
    ~ profit += 10
    Small and steady. You will not make much today, but your back will thank you by noon.
    -> commute
+ [Fry a standard batch — the usual grind]
    ~ batches = 3
    ~ profit += 18
    ~ spirit -= 2
    You fall into the rhythm you know, oil popping, hands moving before your mind is even awake.
    -> commute
+ [Fry a big batch — go for broke]
    ~ batches = 4
    ~ profit += 28
    ~ spirit -= 5
    You load the pan heavy. If today goes well, it goes very well. If it does not, you will feel every minute of this in your shoulders.
    -> commute

=== commute ===
You load the trays onto your head and your stall onto Baba T's keke, and the danfo ride to Oshodi begins — the one part of the day nobody pays you for.

Today the road to Oshodi is a parking lot. Go-slow, as always, as if Lagos itself is daring you to be late.
* [Take the long way round, through the back streets]
    ~ profit -= 2
    You know these back roads better than most okada men. Longer, but at least you are moving.
    -> morning_rush
* [Pay an okada to weave through the go-slow]
    ~ naira -= 5
    Five hundred naira you did not plan to spend, gone before your first akara is even sold. But you reach the market while the morning crowd is still hungry.
    -> morning_rush

=== morning_rush ===
Oshodi Market wakes up loud and fast. By six-thirty your stall is set, your oil is hot, and the first customers are already calling your name — "Mama Ngozi! Mama Ngozi, abeg!"

You serve them two at a time, counting change with one hand and turning akara with the other. The morning rush is the best two hours of your day, and also the hardest.

By eight, the crowd has thinned and your tray is {batches >= 4: already half gone, the big batch moving fast} {batches == 3: moving steadily} {batches <= 2: lighter than you'd like, but there is still a long day ahead}.
-> help_traders

=== help_traders ===
A different kind of noise moves through the market now — not customers, but Jagaban's boys, three of them, walking the rows with their notebook and their swagger, reminding every trader what day it is.

You see them stop at Baba Issa the tailor's stall first, voices rising. Then they move toward Aisha, who sells okra two stalls down. Old Mallam Sule, who fixes radios and sells spare parts by the gutter, watches them coming with his jaw tight.

Helping any of them costs you selling time — and maybe more, if Jagaban's boys notice who is standing where.
-> help_tailor

=== help_tailor ===
Baba Issa is arguing quietly, trying to explain that business has been slow, that he needs one more week.
+ [Stand beside Baba Issa while he talks to them]
    ~ naira -= 3
    ~ solidarity += 1
    You leave your stall untended for ten minutes to stand your ground next to his. The boys do not like an audience. They move on, grumbling, and Baba Issa grips your hand once, hard, and says nothing — he does not need to.
    -> help_okra
+ [Keep frying — your tray will not sell itself]
    Baba Issa's trouble is not your trouble today. You keep your eyes on your own oil.
    -> help_okra

=== help_okra ===
Now it is Aisha's turn. She counts coins into her palm, short of what they are asking, her okra basket only half sold.
+ [Lend Aisha what she is short]
    ~ naira -= 5
    ~ solidarity += 1
    You press the naira notes into her hand before you can think twice about it. "I go pay you back," she says. You both know these days that is a promise, not a guarantee.
    -> help_mallam
+ [Let Aisha handle her own matter]
    You have your own ₦500 to find by two o'clock. You cannot carry everyone.
    -> help_mallam

=== help_mallam ===
Old Mallam Sule does not argue and does not plead. He simply stands in front of his table of radios and spare parts, arms folded, waiting to see what will happen.
+ [Walk over and stand with him, saying nothing]
    ~ solidarity += 1
    You say nothing either. You just stand. Jagaban's boys look at the two of you — then three, when Baba Issa drifts over too — and decide the paperwork can wait for an easier target.
    -> jagaban_visit
+ [Watch from your stall]
    He is a grown man; he has faced worse than three boys with a notebook. Still, something in you feels the distance between your stall and his table.
    -> jagaban_visit

=== jagaban_visit ===
At ten o'clock exactly, Jagaban himself comes through — not one of his boys, the man himself, gold watch heavy on his wrist, smile heavier still.

"Mama Ngozi." He says your name like he owns it. "Levy don increase small. Five hundred naira, two o'clock, no wahala. You know how market work."

He does not wait for an answer. He is already moving to the next stall, the next name he owns for thirty seconds at a time.
-> chidinma_call

=== chidinma_call ===
Your phone rings over the market noise. Chidinma's name on the screen. Your daughter, final year, JAMB form deadline closing in two days.

"Mama, I don check, the form na eighteen thousand naira. If I no submit before Friday..."

You can hear the market in your own voice as you answer, the oil still sizzling behind you.
* ["Don't worry, I will find it. I promise."]
    ~ chidinma_told = "promise"
    ~ spirit -= 2
    The lie costs you nothing today and everything tomorrow, when Friday comes and the money still is not there.
    -> afternoon
* ["Things are tight right now, Chidinma. Give me till the weekend to see what I can do."]
    ~ chidinma_told = "truth"
    ~ spirit += 2
    She goes quiet on the line — not angry, just doing the same math you are doing. "Okay, Mama," she says, and it costs you both something to leave it there, honest and unresolved.
    -> afternoon
* ["Call your father. I cannot carry this one alone."]
    ~ chidinma_told = "father"
    ~ naira += 0
    "You know how he is," she says quietly, and you do, and you asked anyway because today you have nothing left to spend that is not already spoken for.
    -> afternoon

=== afternoon ===
# scene: changemaking
The lunch crowd comes through fast and careless with their notes, and you have maybe forty minutes before two o'clock finds you whether you are ready or not. Old Madam from the cloth stall next door needs change for a thousand-naira note, and there is no time to count twice.
-> confrontation

=== confrontation ===
Two o'clock comes the way it always comes in Oshodi — loud, sudden, and exactly on time. Jagaban's boys arrive first, then Jagaban himself, notebook open.

"So, Mama? Your five hundred naira ready?"
+ [Pay the ₦500]
    ~ naira -= 30
    ~ spirit -= 20
    ~ profit -= 30
    ~ ngozi_outcome = "paid_in_full"
    You count the notes into his hand without looking at his face. It is done. It is always done this way, and that is the part that stays with you longest.
    -> ending_paid_in_full
+ [Stand on your dignity and refuse]
    ~ spirit += 20
    ~ ngozi_outcome = "as_written"
    "I don pay my dues to this market since 1998," you say, loud enough for the row to hear. "I no go pay another man wey just wake up yesterday." The words come out steadier than you feel.
    -> ending_as_written
+ {solidarity >= 3} [Call the traders to stand with you]
    ~ spirit += 15
    ~ naira += 5
    ~ ngozi_outcome = "market_stands"
    "Baba Issa! Aisha! Mallam Sule!" You do not have to call twice. They are already moving, and behind them, half the row. Jagaban's smile does not reach his eyes anymore.
    -> ending_market_stands
+ [Pack up quietly and leave for Mile 12 before he reaches you]
    ~ naira -= 10
    ~ ngozi_outcome = "mile_12"
    You are folding your tray before he is three stalls away. By the time he reaches your spot, there is nothing there but oil stains on bare ground.
    -> ending_mile_12

=== ending_paid_in_full ===
# ending_id: paid_in_full
# ending: Paid in Full
# verdict: Kept her body, lost Chidinma's JAMB money and her pride
Chidinma's JAMB form will have to wait another week. You walk home with your tray light and your pockets lighter, and Oshodi closes around you the same as every other day — nothing broken, nothing won.
-> END

=== ending_as_written ===
# ending_id: as_written
# ending: The Akara on the Ground
# verdict: Kept her Spirit, lost everything else — she collapses; her survival is revealed in Danfo Diaries
# book_canon
Jagaban's hand moves before you finish your sentence. The tray goes over, the oil goes with it, and the last thing you hear clearly is the market going silent around you.

What happens next, Oshodi will talk about for weeks — in whispers, the way Lagos talks about the things it cannot fix.
-> END

=== ending_market_stands ===
# ending_id: market_stands
# ending: The Market Stands
# verdict: Kept both, for today — Jagaban promises to return
The row holds. Jagaban counts the faces standing between him and you, does his own quiet arithmetic, and decides today is not the day.

"We go see," he says, which is not a retreat, only a postponement. You know it. Everyone standing beside you knows it too. But today, the market stood.
-> END

=== ending_mile_12 ===
# ending_id: mile_12
# ending: Mile 12
# verdict: Kept her safety, lost her customers and her spot
You find a corner in Mile 12 by evening, a spot nobody has claimed because nobody wants it — too far from the main road, too close to the drainage. It will take months to build what Oshodi gave you in years.

You are safe tonight. That has to be worth something.
-> END
