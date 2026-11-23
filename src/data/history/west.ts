import { season } from './build';

/** Western franchises: Kings, Nuggets, Jazz, Mavericks, Clippers, Grizzlies, Timberwolves, Pelicans, Thunder, Suns, Blazers. */

type Colors = [string, string];
const team = (franchise: string, city: string, name: string, colors: Colors) => (y: number, r: string) =>
  season(franchise, city, name, y, colors, r);

// Kings (Cincinnati Royals → Kansas City Kings → Sacramento Kings)
const Royals = team('sac', 'Cincinnati', 'Royals', ['#002D62', '#C8102E']);
const KCKings = team('sac', 'Kansas City', 'Kings', ['#1D428A', '#CE1141']);
const Kings = team('sac', 'Sacramento', 'Kings', ['#5A2D81', '#63727A']);
// Nuggets
const Nuggets70s = team('den', 'Denver', 'Nuggets', ['#0E3386', '#FDB927']);
const NuggetsRainbow = team('den', 'Denver', 'Nuggets', ['#005CB9', '#FDB927']);
const Nuggets90s = team('den', 'Denver', 'Nuggets', ['#0E2240', '#8B2131']);
const Nuggets = team('den', 'Denver', 'Nuggets', ['#4D90CD', '#FEC524']);
// Jazz (New Orleans → Utah)
const NOJazz = team('uta', 'New Orleans', 'Jazz', ['#5C2D91', '#00843D']);
const JazzNote = team('uta', 'Utah', 'Jazz', ['#5C2D91', '#00843D']);
const Jazz07 = team('uta', 'Utah', 'Jazz', ['#0C2340', '#6CAEDF']);
const Jazz = team('uta', 'Utah', 'Jazz', ['#002B5C', '#F9A01B']);
// Mavericks
const Mavs80s = team('dal', 'Dallas', 'Mavericks', ['#0064B1', '#00A651']);
const Mavs = team('dal', 'Dallas', 'Mavericks', ['#00538C', '#B8C4CA']);
// Clippers (Buffalo Braves → San Diego Clippers → LA Clippers)
const Braves = team('lac', 'Buffalo', 'Braves', ['#0059B3', '#F58426']);
const SDClippers = team('lac', 'San Diego', 'Clippers', ['#4E8FD0', '#F26522']);
const Clippers = team('lac', 'Los Angeles', 'Clippers', ['#C8102E', '#1D428A']);
// Grizzlies (Vancouver → Memphis)
const VanGrizzlies = team('mem', 'Vancouver', 'Grizzlies', ['#00A5A8', '#9E7E38']);
const Grizzlies = team('mem', 'Memphis', 'Grizzlies', ['#5D76A9', '#12173F']);
// Timberwolves
const Wolves90s = team('min', 'Minnesota', 'Timberwolves', ['#0C2340', '#00843D']);
const Wolves = team('min', 'Minnesota', 'Timberwolves', ['#0C2340', '#78BE20']);
// Pelicans (New Orleans Hornets → Pelicans)
const NOHornetsTeal = team('nop', 'New Orleans', 'Hornets', ['#00788C', '#4F2D7F']);
const NOHornets = team('nop', 'New Orleans', 'Hornets', ['#0C2340', '#B4975A']);
const Pelicans = team('nop', 'New Orleans', 'Pelicans', ['#0C2340', '#C8102E']);
// Thunder (Seattle SuperSonics → Oklahoma City)
const Sonics = team('okc', 'Seattle', 'SuperSonics', ['#00653A', '#FFC200']);
const Thunder = team('okc', 'Oklahoma City', 'Thunder', ['#007AC1', '#EF3B24']);
// Suns, Blazers
const Suns = team('phx', 'Phoenix', 'Suns', ['#1D1160', '#E56020']);
const Blazers = team('por', 'Portland', 'Trail Blazers', ['#E03A3E', '#000000']);

export const west = [
  // ── Kings ──
  Royals(1964, `
    Oscar Robertson|PG|96|25|point
    Jerry Lucas|PF/C|86|23|big
    Wayne Embry|C|83|26|big
    Jack Twyman|SF|80|29|scorer
    Adrian Smith|SG/PG|76|27|shooter
    Tom Hawkins|SF|72|27|slasher
    Arlen Bockhorn|SG|70|30|defender|?
    Bud Olsen|C|68|23|big|?
  `),
  KCKings(1981, `
    Otis Birdsong|SG|85|25|scorer
    Scott Wedman|SF|81|28|scorer
    Phil Ford|PG|81|25|playmaker
    Sam Lacey|C|78|32|point
    Reggie King|PF|75|23|big
    Ernie Grunfeld|SF/SG|72|25|shooter
    Joe Meriweather|C|70|27|rim|?
    Hawkeye Whitney|SF|68|23|scorer|?
  `),
  Kings(1996, `
    Mitch Richmond|SG|90|30|scorer
    Brian Grant|PF|79|23|big
    Šarūnas Marčiulionis|SG|77|31|slasher
    Walt Williams|SF|77|25|scorer
    Olden Polynice|C|76|31|rim
    Billy Owens|SF|75|26|slasher
    Tyus Edney|PG|75|22|slasher
    Michael Smith|PF|72|23|big
  `),
  Kings(2004, `
    Peja Stojaković|SF|90|26|shooter
    Mike Bibby|PG|84|25|scorer
    Brad Miller|C|83|27|point
    Chris Webber|PF|84|30|point|40
    Bobby Jackson|SG/PG|79|30|scorer
    Doug Christie|SG|78|33|defender
    Vlade Divac|C|76|35|point
    Anthony Peeler|SG|74|34|shooter
    Darius Songaila|PF|72|25|big
    Gerald Wallace|SF|70|21|slasher
  `),
  Kings(2023, `
    De'Aaron Fox|PG|89|25|slasher
    Domantas Sabonis|C|89|26|point
    Malik Monk|SG|80|25|scorer
    Kevin Huerter|SG|78|24|shooter
    Harrison Barnes|SF|77|30|wing3d
    Keegan Murray|PF|77|22|shooter
    Trey Lyles|PF|72|27|stretch
    Davion Mitchell|PG|72|24|defender
  `),

  // ── Nuggets ──
  Nuggets70s(1977, `
    David Thompson|SG|92|22|slasher
    Dan Issel|C|87|28|big
    Bobby Jones|PF|84|25|defender
    Marvin Webster|C|76|24|rim
    Paul Silas|PF|75|33|big
    Bobby Wilkerson|SG|74|25|defender
    Ted McClain|PG|72|30|defender|?
  `),
  NuggetsRainbow(1985, `
    Alex English|SF|89|31|scorer
    Fat Lever|PG|82|24|point
    Calvin Natt|SF/PF|80|28|scorer
    Dan Issel|C|78|36|big
    Wayne Cooper|C|76|28|rim
    Bill Hanzlik|SG|74|27|defender
    Mike Evans|PG|72|29|shooter
    T.R. Dunn|SG|72|29|defender
    Elston Turner|SG|70|25|defender
  `),
  Nuggets90s(1994, `
    Dikembe Mutombo|C|87|27|rim
    Mahmoud Abdul-Rauf|PG|82|24|scorer
    LaPhonso Ellis|PF|80|23|big
    Bryant Stith|SG|77|23|twoway
    Reggie Williams|SF|76|29|scorer
    Robert Pack|PG|74|24|slasher
    Brian Williams|PF/C|74|24|big
    Rodney Rogers|PF|73|22|scorer
  `),
  Nuggets(2009, `
    Carmelo Anthony|SF|90|24|scorer
    Chauncey Billups|PG|86|32|twoway
    Nenê|C/PF|82|26|big
    Kenyon Martin|PF|79|31|defender
    J.R. Smith|SG|79|23|scorer
    Chris Andersen|C|77|30|rim
    Linas Kleiza|SF|73|24|scorer
    Dahntay Jones|SG|72|28|defender
    Anthony Carter|PG|70|33|playmaker
  `),
  Nuggets(2013, `
    Ty Lawson|PG|82|25|slasher
    Danilo Gallinari|SF/PF|80|24|stretch
    Andre Iguodala|SF|79|29|twoway
    Kenneth Faried|PF|78|23|big
    Andre Miller|PG|76|36|playmaker
    Wilson Chandler|SF|76|25|scorer
    JaVale McGee|C|74|25|rim
    Corey Brewer|SF|74|27|defender
    Kosta Koufos|C|72|24|big
  `),

  // ── Jazz ──
  NOJazz(1977, `
    Pete Maravich|SG|94|29|scorer
    Gail Goodrich|SG|76|33|scorer|30
    Nate Williams|SF|76|26|scorer|?
    Rich Kelley|C|75|23|big
    Aaron James|SF|74|24|scorer|?
    E.C. Coleman|PF|72|26|defender|?
    Jim McElroy|PG|72|23|playmaker|?
    Otto Moore|C|70|30|big|?
  `),
  JazzNote(1984, `
    Adrian Dantley|SF|91|28|scorer
    Darrell Griffith|SG|82|25|shooter
    Rickey Green|PG|80|29|playmaker
    Mark Eaton|C|80|27|rim
    Thurl Bailey|PF|76|22|scorer
    John Drew|SF|76|29|scorer
    Jeff Wilkins|C|70|28|big|?
    Bobby Hansen|SG|68|22|defender|?
  `),
  JazzNote(1989, `
    Karl Malone|PF|93|25|big
    John Stockton|PG|92|27|playmaker
    Mark Eaton|C|84|32|rim
    Thurl Bailey|PF/SF|80|27|scorer
    Darrell Griffith|SG|76|30|shooter
    Bobby Hansen|SG|72|27|defender
    Mike Brown|PF|70|25|big|?
    Marc Iavaroni|PF|68|32|defender|?
  `),
  Jazz07(2007, `
    Carlos Boozer|PF|86|25|big
    Deron Williams|PG|86|22|playmaker
    Mehmet Okur|C|80|27|stretch
    Andrei Kirilenko|SF/PF|80|25|defender
    Matt Harpring|SF|77|30|scorer
    Derek Fisher|PG|74|32|shooter
    Paul Millsap|PF|74|21|big
    Ronnie Brewer|SG|70|21|defender
  `),
  Jazz(2021, `
    Donovan Mitchell|SG|89|24|scorer
    Rudy Gobert|C|87|28|rim
    Mike Conley|PG|83|33|playmaker
    Bojan Bogdanović|SF|81|31|shooter
    Jordan Clarkson|SG|80|28|scorer
    Joe Ingles|SF|78|33|shooter
    Royce O'Neale|SF|76|27|wing3d
    Derrick Favors|C|74|29|big
    Georges Niang|PF|72|27|shooter
  `),

  // ── Mavericks ──
  Mavs80s(1984, `
    Mark Aguirre|SF|89|24|scorer
    Rolando Blackman|SG|84|25|scorer
    Jay Vincent|PF|78|24|scorer
    Brad Davis|PG|76|28|shooter
    Pat Cummings|PF|74|27|big
    Kurt Nimphius|C|72|25|rim
    Derek Harper|PG|72|22|defender
    Dale Ellis|SG|70|23|shooter
  `),
  Mavs80s(1988, `
    Mark Aguirre|SF|88|28|scorer
    Rolando Blackman|SG|85|29|scorer
    Derek Harper|PG|83|26|defender
    Roy Tarpley|PF|82|23|big
    Sam Perkins|PF/C|80|26|stretch
    James Donaldson|C|78|30|rim
    Detlef Schrempf|SF|74|25|stretch
    Brad Davis|PG|72|32|shooter
  `),
  Mavs(2003, `
    Dirk Nowitzki|PF|93|24|stretch
    Steve Nash|PG|87|29|playmaker
    Michael Finley|SG/SF|84|29|scorer
    Nick Van Exel|PG|80|31|scorer
    Raef LaFrentz|C/PF|74|26|stretch
    Eduardo Nájera|SF/PF|72|26|defender
    Shawn Bradley|C|72|30|rim
    Walt Williams|SF|72|32|shooter|?
  `),

  // ── Clippers ──
  Braves(1975, `
    Bob McAdoo|C/PF|96|23|scorer
    Randy Smith|SG|82|26|slasher
    Jim McMillian|SF|80|26|scorer
    Garfield Heard|PF|78|27|big
    Jack Marin|SF|76|30|shooter
    Ernie DiGregorio|PG|74|24|playmaker|50
    Ken Charles|SG|72|23|defender
    Bob Weiss|PG|70|32|playmaker|?
  `),
  SDClippers(1979, `
    World B. Free|SG|89|25|scorer
    Randy Smith|SG/PG|80|30|slasher
    Kermit Washington|PF|80|27|big
    Swen Nater|C|77|29|big
    Sidney Wicks|PF|76|29|scorer
    Freeman Williams|SG|74|22|scorer
    Nick Weatherspoon|SF|74|28|scorer|?
    Kevin Kunnert|C|72|27|big|?
  `),
  Clippers(1992, `
    Danny Manning|PF/SF|86|25|scorer
    Ron Harper|SG|84|28|slasher
    Charles Smith|PF|79|26|big
    Ken Norman|SF/PF|78|27|scorer
    Doc Rivers|PG|77|30|defender
    Loy Vaught|PF|73|24|big
    Gary Grant|PG|72|26|playmaker
    James Edwards|C|72|36|big
  `),
  Clippers(2006, `
    Elton Brand|PF|92|27|big
    Sam Cassell|PG|82|36|scorer
    Corey Maggette|SF|81|26|slasher
    Cuttino Mobley|SG|79|30|scorer
    Chris Kaman|C|76|23|big
    Vladimir Radmanović|PF|74|25|stretch
    Shaun Livingston|PG|72|20|playmaker
    Quinton Ross|SF|70|24|defender
  `),
  Clippers(2013, `
    Chris Paul|PG|93|27|playmaker
    Blake Griffin|PF|87|24|slasher
    Jamal Crawford|SG|79|32|scorer
    DeAndre Jordan|C|78|24|rim
    Eric Bledsoe|PG|74|23|defender
    Caron Butler|SF|74|32|scorer
    Matt Barnes|SF|74|32|twoway
    Chauncey Billups|PG|74|36|twoway|30
    Lamar Odom|PF|70|33|point
  `),
  Clippers(2021, `
    Kawhi Leonard|SF|94|29|twoway
    Paul George|SF/SG|90|30|twoway
    Reggie Jackson|PG|78|31|scorer
    Marcus Morris Sr.|PF|77|31|stretch
    Nicolas Batum|SF/PF|76|32|wing3d
    Ivica Zubac|C|75|24|big
    Terance Mann|SG|74|24|slasher
    Patrick Beverley|PG|74|32|defender
    Serge Ibaka|C|74|31|stretch
  `),

  // ── Grizzlies ──
  VanGrizzlies(2001, `
    Shareef Abdur-Rahim|SF/PF|86|24|scorer
    Mike Bibby|PG|82|22|playmaker
    Michael Dickerson|SG|77|25|scorer
    Othella Harrington|PF|74|27|big
    Bryant Reeves|C|72|27|big
    Stromile Swift|PF|70|21|rim
    Grant Long|PF|70|34|defender|?
    Isaac Austin|C|70|31|big|?
  `),
  Grizzlies(2004, `
    Pau Gasol|PF|85|23|point
    Jason Williams|PG|77|28|playmaker
    Mike Miller|SF|77|24|shooter
    James Posey|SF|76|27|wing3d
    Bonzi Wells|SG|76|27|scorer
    Shane Battier|SF|75|25|wing3d
    Stromile Swift|PF|74|24|rim
    Lorenzen Wright|C|72|28|big
    Earl Watson|PG|72|24|defender
  `),
  Grizzlies(2015, `
    Marc Gasol|C|87|30|point
    Mike Conley|PG|83|27|playmaker
    Zach Randolph|PF|82|33|big
    Tony Allen|SG|78|33|defender
    Courtney Lee|SG|75|29|wing3d
    Jeff Green|SF/PF|74|28|scorer
    Vince Carter|SG|72|38|shooter
    Kosta Koufos|C|72|26|big
    Beno Udrih|PG|70|32|scorer
  `),
  Grizzlies(2023, `
    Ja Morant|PG|90|23|slasher
    Jaren Jackson Jr.|PF/C|86|23|rim
    Desmond Bane|SG|84|24|shooter
    Dillon Brooks|SF|76|27|defender
    Steven Adams|C|76|29|rim
    Tyus Jones|PG|76|26|playmaker
    Luke Kennard|SG|74|26|shooter
    Brandon Clarke|PF|74|26|big
    Xavier Tillman|PF|72|24|defender
    Santi Aldama|PF|72|22|stretch
  `),

  // ── Timberwolves ──
  Wolves90s(1997, `
    Kevin Garnett|PF|87|20|unicorn
    Tom Gugliotta|PF/SF|85|27|scorer
    Stephon Marbury|PG|82|20|scorer
    Terry Porter|PG|76|33|shooter
    Sam Mitchell|SF|74|33|defender
    Dean Garrett|C|74|30|rim
    Doug West|SG|72|29|scorer
    Chris Carr|SG|70|22|scorer
  `),
  Wolves(2018, `
    Jimmy Butler|SF/SG|89|28|twoway
    Karl-Anthony Towns|C|89|22|stretch
    Andrew Wiggins|SF|78|23|slasher
    Jeff Teague|PG|78|29|playmaker
    Taj Gibson|PF|77|32|defender
    Jamal Crawford|SG|74|37|scorer
    Nemanja Bjelica|PF|72|29|stretch
    Tyus Jones|PG|72|21|playmaker
    Gorgui Dieng|C|70|28|rim
  `),
  Wolves(2024, `
    Anthony Edwards|SG|92|22|slasher
    Rudy Gobert|C|88|31|rim
    Karl-Anthony Towns|C/PF|86|28|stretch
    Naz Reid|C/PF|80|24|stretch
    Jaden McDaniels|SF|79|23|defender
    Mike Conley|PG|78|36|playmaker
    Nickeil Alexander-Walker|SG|75|25|defender
    Kyle Anderson|SF/PF|74|30|playmaker
  `),

  // ── Pelicans / New Orleans Hornets ──
  NOHornetsTeal(2003, `
    Baron Davis|PG|86|23|slasher
    Jamal Mashburn|SF|86|30|scorer
    David Wesley|SG|80|32|scorer
    P.J. Brown|PF|78|33|defender
    Jamaal Magloire|C|76|24|big
    Courtney Alexander|SG|72|25|scorer
    Stacey Augmon|SF|70|34|defender
    Robert Traylor|PF|68|25|big|?
  `),
  NOHornets(2011, `
    Chris Paul|PG|92|25|playmaker
    David West|PF|82|30|big
    Emeka Okafor|C|77|28|rim
    Trevor Ariza|SF|76|25|wing3d
    Carl Landry|PF|74|27|scorer
    Jarrett Jack|PG|74|27|scorer
    Marco Belinelli|SG|74|25|shooter
    Willie Green|SG|70|29|scorer
  `),
  Pelicans(2015, `
    Anthony Davis|PF/C|93|22|unicorn
    Jrue Holiday|PG|82|24|defender
    Tyreke Evans|SG/SF|80|25|slasher
    Eric Gordon|SG|78|26|shooter
    Ryan Anderson|PF|77|27|stretch
    Ömer Aşık|C|74|28|rim
    Quincy Pondexter|SF|70|27|wing3d
    Norris Cole|PG|70|26|defender
    Dante Cunningham|PF|70|27|defender
  `),
  Pelicans(2022, `
    Brandon Ingram|SF|85|24|scorer
    CJ McCollum|SG|84|30|scorer
    Jonas Valančiūnas|C|82|29|big
    Herbert Jones|SF|77|23|defender
    Larry Nance Jr.|PF|74|29|big
    Trey Murphy III|SF|72|21|shooter
    Jose Alvarado|PG|72|23|defender
    Devonte' Graham|PG|72|27|shooter
    Jaxson Hayes|C|70|21|rim
  `),

  // ── Thunder / SuperSonics ──
  Sonics(1979, `
    Gus Williams|PG/SG|87|25|slasher
    Dennis Johnson|SG|86|24|defender
    Jack Sikma|C|84|23|big
    Fred Brown|SG|79|30|shooter
    Lonnie Shelton|PF|79|23|big
    John Johnson|SF|76|31|point
    Paul Silas|PF|72|35|defender
    Dick Snyder|SG|70|35|shooter|?
  `),
  Sonics(1987, `
    Tom Chambers|PF|85|27|scorer
    Dale Ellis|SG|85|26|shooter
    Xavier McDaniel|SF/PF|84|23|scorer
    Alton Lister|C|76|28|rim
    Nate McMillan|PG|74|22|defender
    Maurice Lucas|PF|72|34|big|?
    Danny Young|PG|70|24|shooter
    Clemon Johnson|C|68|30|big|?
  `),
  Sonics(1994, `
    Gary Payton|PG|90|25|twoway
    Shawn Kemp|PF|89|24|slasher
    Detlef Schrempf|SF|83|31|stretch
    Ricky Pierce|SG|78|34|scorer
    Kendall Gill|SG|78|25|twoway
    Nate McMillan|PG/SG|78|29|defender
    Sam Perkins|PF/C|77|32|stretch
    Michael Cage|PF|72|32|big
  `),
  Sonics(1998, `
    Gary Payton|PG|92|29|twoway
    Vin Baker|PF|84|26|big
    Detlef Schrempf|SF|80|35|stretch
    Hersey Hawkins|SG|77|31|shooter
    Dale Ellis|SG|74|37|shooter
    Sam Perkins|PF/C|72|36|stretch
    Greg Anthony|PG|70|30|defender
    Jim McIlvaine|C|68|25|rim
  `),
  Thunder(2014, `
    Kevin Durant|SF|95|25|scorer
    Russell Westbrook|PG|88|25|slasher|45
    Serge Ibaka|PF/C|84|24|rim
    Reggie Jackson|PG|77|24|scorer
    Thabo Sefolosha|SG/SF|74|29|defender
    Kendrick Perkins|C|72|29|rim
    Caron Butler|SF|72|34|scorer
    Jeremy Lamb|SG|72|21|shooter
    Derek Fisher|PG|70|39|shooter
    Steven Adams|C|70|20|rim
  `),

  // ── Suns ──
  Suns(1976, `
    Paul Westphal|SG|87|25|scorer
    Alvan Adams|C|84|21|point
    Curtis Perry|PF|77|27|big
    Garfield Heard|PF|77|27|defender
    Ricky Sobers|PG|76|23|slasher
    Dick Van Arsdale|SG|76|33|scorer
    Keith Erickson|SF|72|32|defender
    Dennis Awtrey|C|70|28|big|?
  `),
  Suns(1981, `
    Walter Davis|SG/SF|85|26|scorer
    Dennis Johnson|SG|85|26|defender
    Truck Robinson|PF|82|29|big
    Alvan Adams|C|80|26|point
    Kyle Macy|PG|74|24|shooter
    Jeff Cook|PF|72|24|big
    Johnny High|SG|72|23|defender
    Rich Kelley|C|72|28|big|?
  `),
  Suns(1989, `
    Kevin Johnson|PG|89|23|playmaker
    Tom Chambers|PF|86|29|scorer
    Eddie Johnson|SF|80|29|scorer
    Jeff Hornacek|SG|79|25|shooter
    Mark West|C|74|28|rim
    Tyrone Corbin|SF|74|26|defender
    Dan Majerle|SG|72|23|wing3d
    Tim Perry|PF|70|23|big
  `),
  Suns(2010, `
    Steve Nash|PG|90|36|playmaker
    Amar'e Stoudemire|PF/C|87|27|slasher
    Jason Richardson|SG|79|29|slasher
    Grant Hill|SF|77|37|twoway
    Channing Frye|C/PF|76|26|stretch
    Jared Dudley|SF|74|24|wing3d
    Leandro Barbosa|SG|74|27|slasher
    Goran Dragić|PG|72|23|scorer
    Robin Lopez|C|72|22|rim
  `),

  // ── Trail Blazers ──
  Blazers(1985, `
    Kiki Vandeweghe|SF|85|26|scorer
    Jim Paxson|SG|82|27|scorer
    Mychal Thompson|PF/C|80|30|big
    Clyde Drexler|SG|80|22|slasher
    Darnell Valentine|PG|77|26|defender
    Kenny Carr|PF|76|29|big
    Sam Bowie|C|76|24|rim
    Jerome Kersey|SF|70|22|slasher
  `),
  Blazers(2000, `
    Rasheed Wallace|PF|85|25|stretch
    Scottie Pippen|SF|84|34|twoway
    Arvydas Sabonis|C|82|35|point
    Steve Smith|SG|80|31|shooter
    Damon Stoudamire|PG|79|26|scorer
    Bonzi Wells|SG|77|23|scorer
    Brian Grant|PF|76|27|big
    Greg Anthony|PG|72|32|defender
    Detlef Schrempf|SF|70|37|stretch
  `),
  Blazers(2019, `
    Damian Lillard|PG|92|28|scorer
    CJ McCollum|SG|84|27|scorer
    Jusuf Nurkić|C|80|24|big
    Al-Farouq Aminu|PF|76|28|wing3d
    Enes Kanter|C|74|26|big
    Maurice Harkless|SF|74|25|wing3d
    Rodney Hood|SG|74|26|scorer
    Seth Curry|SG|74|28|shooter
    Zach Collins|PF/C|72|21|big
    Evan Turner|SF|72|30|playmaker
  `),
];
