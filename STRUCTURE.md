# How the set is organised

Every vector lives in exactly one **category**, and every category in one of eight **sections**. The data is
[`packages/vectors/src/categories.ts`](packages/vectors/src/categories.ts); `pnpm categories:check` (part of `pnpm check`)
fails for a vector with no category, a name listed twice, or a name that is not a file. The Library page reads the same
file: with no search it shows the set in this order, and searching for a category name ("kitchen") finds its members.

## Where the shape came from

- **PriceRunner** (the UK shop comparison site) has 14 top-level categories, each split into hundreds of product types:
  Home & Interior, Garden & Patio, Kids & Family, Toys & Hobbies, Gaming & Entertainment, Computing, Phones & Wearables,
  Sound & Vision, Photography, Clothing & Accessories, Health & Beauty, Sports & Outdoor, Do it yourself, Motor Transport.
  It tells us what real products need vectors for, so the object categories below follow it.
- **Lucide** has 44 flat categories (Accessibility, Arrows, Buildings, Communication, Devices, Food & beverage, Shopping,
  Weather, ...) and lets an icon sit in several. **Tabler** has about 40 flat ones (Animals, Arrows, E-commerce, Food,
  Health, Map, Vehicles, Weather, ...). They show what a library needs to stay findable: a short list of names that
  describe what a thing *is*. We keep that, with one change: **one home per vector**, so counts are exact and a new
  vector has one obvious place. Other ways to find it are search terms, not extra categories.
- **Two levels, like PriceRunner; plain names, like Lucide.** Eight sections so the Library has a table of contents;
  28 categories so no list is long enough to scroll past blindly (the biggest has 28).

(Phosphor's site did not expose its categories in a way I could read, so it was not used.)

## The map

| Section | Category | Vectors | PriceRunner it serves |
| --- | --- | ---: | --- |
| Interface | Actions | 28 | |
| | Controls and layout | 19 | |
| | Status and reactions | 13 | |
| | Shapes and symbols | 9 | |
| Content and data | Files and writing | 11 | |
| | Design and drawing | 5 | |
| | Charts and maths | 10 | |
| | Code and data | 13 | |
| | Time and calendar | 6 | |
| Devices and media | Computing and devices | 15 | Computing, Phones & Wearables |
| | Connectivity | 8 | |
| | Sound and music | 11 | Sound & Vision, Gaming & Entertainment |
| | Photo and video | 6 | Photography |
| People and access | People and access | 8 | |
| | Communication | 4 | |
| Commerce | Shopping and payments | 14 | the whole site: shop, basket, price, deal |
| | Fashion and accessories | 8 | Clothing & Accessories |
| Home and living | Home and furniture | 14 | Home & Interior |
| | Food and kitchen | 19 | Home & Interior (kitchen, food and drink) |
| | Garden and outdoors | 11 | Garden & Patio, Sports & Outdoor (camping) |
| Nature and world | Direction and places | 15 | |
| | Transport | 8 | Motor Transport |
| | Weather and sky | 10 | |
| | Nature and animals | 6 | |
| Making and play | Tools and DIY | 11 | Do it yourself |
| | Health and sport | 10 | Health & Beauty, Sports & Outdoor |
| | Games and toys | 7 | Toys & Hobbies, Kids & Family, Gaming & Entertainment |
| | Science and learning | 4 | |

## Rules for adding a vector

1. Pick the category by what the thing **is**, not where it is used (a bell is *status*, not *shopping*). If two fit,
   take the one a person would look in first.
2. Add the name, in alphabetical order, to that category's list in `categories.ts`. A state (`mic-off`) is not a
   vector; it belongs to its base.
3. Do not add a category for one or two vectors. A new category needs about eight that nothing else fits. The two likely
   ones are marked below.
4. Run `pnpm categories:check`.

## Where the next vectors are needed

Taken from the PriceRunner subcategories, against what each category holds today. Drawn from this list so far: router, sim-card, turntable, tripod, suitcase, sink, radiator, barbecue, puzzle, perfume, lipstick, drill, fuel-pump, bicycle. Tried and dropped (read as another object at 24px): polaroid (a computer), dress (a flask), baby-bottle (a jar). These are candidates, not a plan:
check the vector is really recognisable at 16px in this style before drawing it.

| Category | Missing today (PriceRunner product types and common objects) |
| --- | --- |
| Computing and devices | desktop, graphics card, scanner, smartwatch, earbuds, SD card, USB stick, e-reader, 3D printer, drone |
| Sound and music | guitar, piano, amplifier, remote, CD |
| Photo and video | lens, flash, film roll, instant camera, camcorder |
| Fashion and accessories | bag, sunglasses, ring, necklace, shoe, boot, dress, jacket, hat, tie, sock |
| Home and furniture | bathtub, shower, toilet, curtains, mirror, rug, bookshelf, wardrobe, table, fan, heater, iron, vacuum cleaner |
| Food and kitchen | blender, coffee maker, mixer, air fryer, microwave, oven, dishwasher, bottle, beer, bread, pizza, carrot |
| Garden and outdoors | lawn mower, hedge trimmer, wheelbarrow, hose, parasol, shed, hammock |
| Transport | scooter, motorbike, bus, plane, truck, tyre, helmet |
| Tools and DIY | saw, pliers, tape measure, spirit level, paintbrush, pipe, boiler |
| Games and toys | teddy bear, doll, building blocks, board game, rubber duck, robot |
| Health and sport | toothbrush, hairdryer, razor, stethoscope, football, basketball, tennis racket, fishing rod, binoculars |

Two categories will probably be split out once they pass about eight vectors: **Beauty** (from Health and sport:
hairdryer, razor, perfume, lipstick, toothbrush, comb, nail polish, mirror) and **Kids and baby** (from Games and toys:
pushchair, baby bottle, pacifier, cot, nappy, ...). **Sport** may split from health the same way.
