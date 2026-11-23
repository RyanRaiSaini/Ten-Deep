import { season } from './build';

/** Eastern franchises: Bucks, Hawks, Nets, Cavaliers, Pacers, Hornets/Bobcats, Bullets/Wizards, Raptors, Magic. */

type Colors = [string, string];
const team = (franchise: string, city: string, name: string, colors: Colors) => (y: number, r: string) =>
  season(franchise, city, name, y, colors, r);

// Bucks
const BucksClassic = team('mil', 'Milwaukee', 'Bucks', ['#00471B', '#C8102E']);
const Bucks90s = team('mil', 'Milwaukee', 'Bucks', ['#2C5234', '#702F8A']);
const Bucks = team('mil', 'Milwaukee', 'Bucks', ['#00471B', '#EEE1C6']);
// Hawks (St. Louis → Atlanta)
const STLHawks = team('atl', 'St. Louis', 'Hawks', ['#002B5C', '#C8102E']);
const Hawks = team('atl', 'Atlanta', 'Hawks', ['#C8102E', '#FDB927']);
const Hawks15 = team('atl', 'Atlanta', 'Hawks', ['#E03A3E', '#C1D32F']);
// Nets (New Jersey → Brooklyn)
const NJNets = team('bkn', 'New Jersey', 'Nets', ['#002A60', '#CD1041']);
const BKNets = team('bkn', 'Brooklyn', 'Nets', ['#000000', '#FFFFFF']);
// Cavaliers
const Cavs = team('cle', 'Cleveland', 'Cavaliers', ['#860038', '#FDBB30']);
const Cavs80s = team('cle', 'Cleveland', 'Cavaliers', ['#E35205', '#003DA5']);
// Pacers
const Pacers = team('ind', 'Indiana', 'Pacers', ['#002D62', '#FDBB30']);
// Charlotte Hornets / Bobcats
const CLTHornets90s = team('cha', 'Charlotte', 'Hornets', ['#00788C', '#1D1160']);
const Bobcats = team('cha', 'Charlotte', 'Bobcats', ['#F26532', '#29588B']);
const CLTHornets = team('cha', 'Charlotte', 'Hornets', ['#1D1160', '#00788C']);
// Bullets / Wizards (Baltimore → Washington)
const BaltBullets = team('was', 'Baltimore', 'Bullets', ['#0046AD', '#F47A20']);
const Bullets = team('was', 'Washington', 'Bullets', ['#C8102E', '#002B5C']);
const Wizards07 = team('was', 'Washington', 'Wizards', ['#002566', '#B4975A']);
const Wizards = team('was', 'Washington', 'Wizards', ['#002B5C', '#E31837']);
// Raptors
const RaptorsPurple = team('tor', 'Toronto', 'Raptors', ['#753BBD', '#CE1141']);
const Raptors = team('tor', 'Toronto', 'Raptors', ['#CE1141', '#000000']);
// Magic
const Magic = team('orl', 'Orlando', 'Magic', ['#0077C0', '#C4CED4']);

export const east = [
  // ── Bucks ──
  BucksClassic(1974, `
    Kareem Abdul-Jabbar|C|97|26|unicorn
    Bob Dandridge|SF|84|26|scorer
    Oscar Robertson|PG|82|35|point
    Lucius Allen|PG|80|26|scorer
    Curtis Perry|PF|76|25|big
    Cornell Warner|PF|74|25|big
    Jon McGlocklin|SG|72|30|shooter
    Mickey Davis|SF|72|23|scorer
  `),
  BucksClassic(1981, `
    Marques Johnson|SF|88|25|scorer
    Sidney Moncrief|SG|84|23|twoway
    Bob Lanier|C|82|32|big
    Junior Bridgeman|SG/SF|80|27|scorer
    Quinn Buckner|PG|78|26|defender
    Brian Winters|SG|77|28|shooter
    Mickey Johnson|PF|76|28|big|?
    Pat Cummings|PF|70|24|big
    Harvey Catchings|C|70|29|rim
  `),
  BucksClassic(1986, `
    Sidney Moncrief|SG|88|28|twoway
    Terry Cummings|PF|86|25|scorer
    Paul Pressey|SF/PG|82|27|point
    Ricky Pierce|SG|79|26|scorer
    Alton Lister|C|76|27|rim
    Craig Hodges|SG|75|25|shooter
    Randy Breuer|C|72|25|big
    Kenny Fields|SF|68|23|slasher|?
  `),
  Bucks90s(2001, `
    Ray Allen|SG|90|25|shooter
    Glenn Robinson|SF|85|28|scorer
    Sam Cassell|PG|85|31|scorer
    Tim Thomas|SF/PF|76|24|stretch
    Lindsey Hunter|PG|74|30|defender
    Ervin Johnson|C|72|33|rim
    Jason Caffey|PF|70|27|big
    Scott Williams|PF/C|70|32|big
  `),
  Bucks(2019, `
    Giannis Antetokounmpo|PF|96|24|slasher
    Khris Middleton|SF|84|27|scorer
    Eric Bledsoe|PG|81|29|defender
    Malcolm Brogdon|SG|80|26|shooter
    Brook Lopez|C|79|30|stretch
    Nikola Mirotić|PF|76|28|stretch
    George Hill|PG|74|32|twoway
    Ersan İlyasova|PF|72|31|stretch
    Pat Connaughton|SG|72|26|wing3d
  `),

  // ── Hawks ──
  STLHawks(1958, `
    Bob Pettit|PF|95|25|big
    Cliff Hagan|SF|86|26|scorer
    Ed Macauley|C/PF|80|30|scorer
    Slater Martin|PG|80|32|defender
    Charlie Share|C|76|30|big
    Jack McMahon|PG|74|29|playmaker
    Win Wilfong|SG|70|24|scorer|?
    Jack Coleman|PF|70|33|big|?
  `),
  STLHawks(1968, `
    Lenny Wilkens|PG|88|30|playmaker
    Zelmo Beaty|C|85|28|big
    Lou Hudson|SG/SF|84|23|scorer
    Bill Bridges|PF|84|29|big
    Joe Caldwell|SF|82|26|defender
    Paul Silas|PF|76|24|big
    Don Ohl|SG|74|31|scorer|?
  `),
  Hawks(1980, `
    John Drew|SF|84|25|scorer
    Dan Roundfield|PF|84|26|big
    Tree Rollins|C|75|24|rim
    Steve Hawes|C|74|29|big
    Armond Hill|PG|74|27|playmaker
    Tom McMillen|PF|72|27|stretch
    Charlie Criss|PG|72|31|scorer
  `),
  Hawks(1994, `
    Mookie Blaylock|PG|84|27|defender
    Kevin Willis|PF|82|31|big
    Danny Manning|PF|82|27|scorer
    Stacey Augmon|SF|76|25|defender
    Craig Ehlo|SG|74|32|wing3d
    Duane Ferrell|SF|72|29|slasher
    Andrew Lang|C|72|27|rim
    Jon Koncak|C|70|30|rim
  `),
  Hawks15(2015, `
    Al Horford|C/PF|84|28|stretch
    Paul Millsap|PF|84|29|twoway
    Jeff Teague|PG|82|26|playmaker
    Kyle Korver|SG|80|33|shooter
    DeMarre Carroll|SF|78|28|wing3d
    Dennis Schröder|PG|74|21|scorer
    Thabo Sefolosha|SF|72|30|defender
    Kent Bazemore|SF|72|25|wing3d
    Mike Scott|PF|72|26|stretch
  `),
  Hawks(2021, `
    Trae Young|PG|88|22|scorer
    John Collins|PF|80|23|big
    Clint Capela|C|80|27|rim
    Bogdan Bogdanović|SG|79|28|shooter
    Danilo Gallinari|PF|77|32|stretch
    De'Andre Hunter|SF|76|23|wing3d
    Kevin Huerter|SG|76|22|shooter
    Lou Williams|SG|74|34|scorer
  `),

  // ── Nets ──
  NJNets(1984, `
    Buck Williams|PF|84|24|big
    Otis Birdsong|SG|82|28|scorer
    Micheal Ray Richardson|PG|82|28|defender
    Darryl Dawkins|C|78|27|rim
    Albert King|SF|78|24|scorer
    Mike Gminski|C|76|24|big
    Darwin Cook|SG|74|25|defender
    Kelvin Ransey|PG|70|25|playmaker|?
  `),
  NJNets(1994, `
    Derrick Coleman|PF|87|26|scorer
    Kenny Anderson|PG|85|23|playmaker
    Armen Gilliam|PF|77|29|big
    Chris Morris|SF|76|28|slasher
    Kevin Edwards|SG|76|28|scorer
    Benoit Benjamin|C|74|29|big
    P.J. Brown|PF|74|24|defender
  `),
  BKNets(2013, `
    Deron Williams|PG|85|28|playmaker
    Brook Lopez|C|84|25|big
    Joe Johnson|SG|81|31|scorer
    Gerald Wallace|SF|76|30|defender
    Reggie Evans|PF|74|32|big
    Andray Blatche|PF/C|74|26|big
    C.J. Watson|PG|72|28|scorer
    Kris Humphries|PF|70|28|big
    MarShon Brooks|SG|70|24|scorer
  `),
  BKNets(2021, `
    Kevin Durant|SF/PF|94|32|scorer
    James Harden|SG/PG|92|31|playmaker
    Kyrie Irving|PG|91|28|scorer
    Joe Harris|SF|78|29|shooter
    Jeff Green|PF|74|34|stretch
    Bruce Brown|SG|74|24|defender
    Nic Claxton|C|74|21|rim
    Blake Griffin|PF|72|32|stretch
    DeAndre Jordan|C|72|32|rim
    Landry Shamet|SG|72|24|shooter
  `),

  // ── Cavaliers ──
  Cavs(1976, `
    Jim Chones|C/PF|80|26|big
    Austin Carr|SG|78|28|scorer
    Bingo Smith|SF|76|30|shooter
    Campy Russell|SF|76|24|scorer
    Jim Cleamons|PG|76|26|defender
    Nate Thurmond|C|76|34|rim
    Dick Snyder|SG|74|32|shooter
    Jim Brewer|PF|72|24|defender
    Foots Walker|PG|70|25|playmaker
  `),
  Cavs80s(1989, `
    Mark Price|PG|87|25|shooter
    Brad Daugherty|C|85|23|point
    Larry Nance|PF|84|30|rim
    Ron Harper|SG|82|25|slasher
    Hot Rod Williams|PF/C|79|26|defender
    Craig Ehlo|SG|76|27|wing3d
    Mike Sanders|SF|72|28|defender
    Darnell Valentine|PG|70|30|defender|?
  `),
  Cavs80s(1992, `
    Mark Price|PG|88|27|shooter
    Brad Daugherty|C|87|26|point
    Larry Nance|PF|84|33|rim
    Hot Rod Williams|PF/C|80|29|defender
    Craig Ehlo|SG|77|30|wing3d
    John Battle|SG|74|29|scorer
    Terrell Brandon|PG|72|21|scorer
    Steve Kerr|PG|70|26|shooter
    Danny Ferry|PF|70|25|stretch
  `),
  Cavs(2018, `
    LeBron James|SF/PF|97|33|point
    Kevin Love|PF/C|82|29|stretch
    Jeff Green|PF|76|31|stretch
    Jordan Clarkson|SG|76|25|scorer
    George Hill|PG|75|31|twoway
    Kyle Korver|SG|74|36|shooter
    J.R. Smith|SG|74|32|shooter
    Tristan Thompson|C|74|27|big
    Larry Nance Jr.|PF|74|25|big
    Rodney Hood|SG|72|25|scorer
  `),

  // ── Pacers ──
  Pacers(1994, `
    Reggie Miller|SG|90|28|shooter
    Rik Smits|C|80|27|big
    Derrick McKey|SF|80|27|twoway
    Dale Davis|PF|79|25|rim
    Antonio Davis|PF/C|77|25|defender
    Pooh Richardson|PG|76|27|playmaker
    Haywoode Workman|PG|74|28|defender
    Byron Scott|SG|72|33|shooter
    Vern Fleming|PG|72|33|playmaker
  `),
  Pacers(1998, `
    Reggie Miller|SG|88|32|shooter
    Rik Smits|C|80|31|big
    Mark Jackson|PG|79|32|playmaker
    Chris Mullin|SF|78|34|shooter
    Dale Davis|PF|77|28|rim
    Antonio Davis|PF/C|76|29|defender
    Derrick McKey|SF|74|31|twoway
    Jalen Rose|SF|72|25|scorer
    Travis Best|PG|72|25|scorer
  `),
  Pacers(2004, `
    Jermaine O'Neal|PF/C|90|25|big
    Ron Artest|SF|86|24|defender
    Al Harrington|PF|79|24|stretch
    Reggie Miller|SG|78|38|shooter
    Jamaal Tinsley|PG|77|26|playmaker
    Jeff Foster|C|74|27|rim
    Anthony Johnson|PG|72|29|defender
    Fred Jones|SG|72|25|slasher
    Austin Croshere|PF|70|28|stretch
  `),
  Pacers(2025, `
    Tyrese Haliburton|PG|90|25|playmaker
    Pascal Siakam|PF|87|30|slasher
    Myles Turner|C|80|28|stretch
    Andrew Nembhard|PG/SG|76|25|defender
    Aaron Nesmith|SF|76|25|wing3d
    Bennedict Mathurin|SG|76|22|scorer
    Obi Toppin|PF|74|27|stretch
    T.J. McConnell|PG|74|32|playmaker
  `),

  // ── Charlotte Hornets / Bobcats ──
  CLTHornets90s(1993, `
    Larry Johnson|PF|88|23|scorer
    Alonzo Mourning|C|87|23|rim
    Kendall Gill|SG|80|24|twoway
    Muggsy Bogues|PG|78|28|playmaker
    Dell Curry|SG|78|28|shooter
    Johnny Newman|SF|78|29|scorer
    Kenny Gattison|PF|74|28|big
    David Wingate|SG|70|29|defender
    Mike Gminski|C|70|33|big|?
  `),
  CLTHornets90s(1997, `
    Glen Rice|SF|89|29|shooter
    Anthony Mason|PF|84|30|point
    Vlade Divac|C|80|29|point
    Dell Curry|SG|77|32|shooter
    Muggsy Bogues|PG|74|32|playmaker
    Matt Geiger|C|74|27|big
    Tony Delk|SG|70|23|scorer
  `),
  CLTHornets90s(2001, `
    Jamal Mashburn|SF|84|28|scorer
    Baron Davis|PG|83|21|slasher
    David Wesley|SG|80|30|scorer
    P.J. Brown|PF|78|31|defender
    Elden Campbell|C|78|32|rim
    Derrick Coleman|PF|72|33|big
    Hersey Hawkins|SG|72|34|shooter|?
    Jamaal Magloire|C|68|22|big
  `),
  Bobcats(2010, `
    Gerald Wallace|SF|84|27|defender
    Stephen Jackson|SG/SF|80|31|scorer
    Raymond Felton|PG|77|25|playmaker
    Boris Diaw|PF|76|27|point
    Tyson Chandler|C|74|27|rim
    Nazr Mohammed|C|74|32|big
    D.J. Augustin|PG|72|22|shooter
    Tyrus Thomas|PF|72|23|rim
  `),
  CLTHornets(2016, `
    Kemba Walker|PG|87|25|scorer
    Nicolas Batum|SF|80|27|playmaker
    Al Jefferson|C|76|31|big
    Marvin Williams|PF|76|29|stretch
    Jeremy Lin|PG|76|27|slasher
    Cody Zeller|C|74|23|big
    Courtney Lee|SG|74|30|wing3d
    Frank Kaminsky|PF|72|22|stretch
  `),

  // ── Bullets / Wizards ──
  BaltBullets(1969, `
    Earl Monroe|SG|89|24|scorer
    Wes Unseld|C|88|22|big
    Gus Johnson|PF|84|30|big
    Kevin Loughery|SG|80|28|scorer
    Jack Marin|SF|78|24|shooter
    Ray Scott|PF|76|30|big
    LeRoy Ellis|C|74|29|big
  `),
  Bullets(1975, `
    Elvin Hayes|PF|92|29|big
    Phil Chenier|SG|84|24|scorer
    Wes Unseld|C|84|29|big
    Kevin Porter|PG|80|24|playmaker
    Mike Riordan|SF|74|29|defender
    Nick Weatherspoon|PF|74|24|scorer
    Clem Haskins|SG|72|31|scorer
    Jimmy Jones|SG|72|30|scorer|?
  `),
  Bullets(1978, `
    Elvin Hayes|PF|90|32|big
    Bob Dandridge|SF|85|30|scorer
    Wes Unseld|C|80|32|big
    Kevin Grevey|SG|77|25|shooter
    Tom Henderson|PG|76|26|playmaker
    Mitch Kupchak|PF/C|76|23|big
    Larry Wright|PG|72|23|scorer
    Greg Ballard|SF|72|23|scorer
    Charles Johnson|SG|72|29|shooter
  `),
  Bullets(1997, `
    Chris Webber|PF|88|24|point
    Juwan Howard|PF|84|24|scorer
    Rod Strickland|PG|84|30|playmaker
    Gheorghe Mureşan|C|78|26|big
    Calbert Cheaney|SG/SF|74|25|scorer
    Tracy Murray|SF|74|25|shooter
    Harvey Grant|PF|72|31|defender
    Chris Whitney|PG|70|25|shooter
  `),
  Wizards07(2007, `
    Gilbert Arenas|PG|91|25|scorer
    Antawn Jamison|PF|83|30|scorer
    Caron Butler|SF|83|27|twoway
    DeShawn Stevenson|SG|74|25|defender
    Brendan Haywood|C|74|27|rim
    Antonio Daniels|PG|72|31|playmaker
    Jarvis Hayes|SF|72|25|shooter
    Etan Thomas|C|70|28|rim
    Darius Songaila|PF|70|28|big
  `),
  Wizards(2017, `
    John Wall|PG|90|26|slasher
    Bradley Beal|SG|87|23|scorer
    Otto Porter Jr.|SF|79|23|wing3d
    Marcin Gortat|C|77|32|big
    Markieff Morris|PF|76|27|stretch
    Bojan Bogdanović|SF|74|27|shooter
    Kelly Oubre Jr.|SF|72|21|defender
    Ian Mahinmi|C|70|30|rim
  `),

  // ── Raptors ──
  RaptorsPurple(2000, `
    Vince Carter|SG/SF|92|23|slasher
    Tracy McGrady|SF|82|20|scorer
    Antonio Davis|C/PF|80|31|big
    Doug Christie|SG|79|29|defender
    Charles Oakley|PF|76|36|big
    Kevin Willis|PF|74|37|big
    Dee Brown|PG|72|31|shooter
    Alvin Williams|PG|72|25|defender
    Muggsy Bogues|PG|70|35|playmaker
  `),
  Raptors(2007, `
    Chris Bosh|PF/C|89|22|stretch
    T.J. Ford|PG|78|23|playmaker
    José Calderón|PG|77|25|playmaker
    Anthony Parker|SG|76|31|wing3d
    Morris Peterson|SF|73|29|wing3d
    Andrea Bargnani|PF/C|72|21|stretch
    Jorge Garbajosa|PF|72|29|stretch
    Rasho Nesterović|C|70|30|big
  `),
  Raptors(2016, `
    Kyle Lowry|PG|89|29|playmaker
    DeMar DeRozan|SG|88|26|scorer
    Jonas Valančiūnas|C|80|23|big
    Cory Joseph|PG|75|24|defender
    DeMarre Carroll|SF|74|29|wing3d
    Bismack Biyombo|C|74|23|rim
    Terrence Ross|SF|74|25|shooter
    Patrick Patterson|PF|74|26|stretch
    Norman Powell|SG|70|22|slasher
  `),

  // ── Magic ──
  Magic(2000, `
    Darrell Armstrong|PG|80|31|defender
    Ben Wallace|C|74|25|defender
    Bo Outlaw|PF|74|28|defender
    Matt Harpring|SF|74|23|scorer
    Chucky Atkins|PG|72|25|scorer
    John Amaechi|C|72|29|big
    Corey Maggette|SF|72|20|slasher
    Pat Garrity|PF|70|23|stretch
    Michael Doleac|C|70|22|big
  `),
  Magic(2010, `
    Dwight Howard|C|92|24|rim
    Vince Carter|SG|80|33|scorer
    Rashard Lewis|PF|80|30|stretch
    Jameer Nelson|PG|78|28|scorer
    Matt Barnes|SF|74|30|twoway
    J.J. Redick|SG|74|25|shooter
    Mickaël Piétrus|SF|72|28|wing3d
    Marcin Gortat|C|72|26|rim
    Ryan Anderson|PF|72|21|stretch
    Jason Williams|PG|70|34|playmaker
  `),
];
