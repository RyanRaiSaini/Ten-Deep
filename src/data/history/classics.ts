import { season } from './build';

/** Extra 1980s/1990s (and a few later) seasons for the franchises that already have their own files. */

type Colors = [string, string];
const team = (franchise: string, city: string, name: string, colors: Colors) => (y: number, r: string) =>
  season(franchise, city, name, y, colors, r);

const Lakers = team('lal', 'Los Angeles', 'Lakers', ['#552583', '#FDB927']);
const Celtics = team('bos', 'Boston', 'Celtics', ['#007A33', '#BA9653']);
const Pistons = team('det', 'Detroit', 'Pistons', ['#C8102E', '#1D42BA']);
const PistonsTeal = team('det', 'Detroit', 'Pistons', ['#007A87', '#7A1F3D']);
const Rockets90s = team('hou', 'Houston', 'Rockets', ['#BA0C2F', '#002855']);
const Rockets = team('hou', 'Houston', 'Rockets', ['#CE1141', '#000000']);
const Spurs = team('sas', 'San Antonio', 'Spurs', ['#C4CED4', '#000000']);
const Warriors = team('gsw', 'Golden State', 'Warriors', ['#1D428A', '#FFC72C']);
const Heat = team('mia', 'Miami', 'Heat', ['#98002E', '#F9A01B']);
const Knicks = team('nyk', 'New York', 'Knicks', ['#006BB6', '#F58426']);
const Sixers = team('phi', 'Philadelphia', '76ers', ['#006BB6', '#ED174C']);

export const classics = [
  Lakers(1982, `
    Magic Johnson|PG|92|22|point
    Kareem Abdul-Jabbar|C|91|34|unicorn
    Jamaal Wilkes|SF|86|28|scorer
    Norm Nixon|PG/SG|84|26|playmaker
    Michael Cooper|SG/SF|78|25|defender
    Bob McAdoo|PF/C|74|30|scorer
    Mitch Kupchak|C/PF|74|27|big|30
    Kurt Rambis|PF|70|24|defender
    Jim Brewer|PF|68|30|defender
  `),
  Celtics(1981, `
    Larry Bird|SF/PF|94|24|scorer
    Robert Parish|C|86|27|big
    Nate Archibald|PG|84|32|playmaker
    Cedric Maxwell|SF|82|25|twoway
    Kevin McHale|PF|78|23|big
    Chris Ford|SG|74|32|shooter
    Gerald Henderson|PG|74|25|scorer
    Rick Robey|C/PF|72|25|big
    M.L. Carr|SF|70|30|defender
  `),
  Celtics(1991, `
    Larry Bird|SF/PF|88|34|scorer|50
    Reggie Lewis|SG/SF|84|25|scorer
    Kevin McHale|PF|84|33|big
    Robert Parish|C|82|37|big
    Kevin Gamble|SG|78|25|shooter
    Brian Shaw|PG|76|24|playmaker
    Dee Brown|PG|76|22|slasher
    Ed Pinckney|PF|70|28|defender
  `),
  Pistons(1984, `
    Isiah Thomas|PG|90|22|playmaker
    Kelly Tripucka|SF|84|25|scorer
    Bill Laimbeer|C|82|26|stretch
    Vinnie Johnson|SG|78|27|scorer
    John Long|SG|76|27|scorer
    Terry Tyler|PF|76|27|defender
    Kent Benson|C|72|29|big
    Cliff Levingston|PF|68|23|defender
  `),
  PistonsTeal(1997, `
    Grant Hill|SF|94|24|point
    Joe Dumars|SG|82|33|twoway
    Otis Thorpe|PF|79|34|big
    Lindsey Hunter|PG|75|26|defender
    Terry Mills|PF|74|29|stretch
    Theo Ratliff|C|74|23|rim
    Grant Long|PF|72|31|defender
    Aaron McKie|SG|72|24|twoway|?
  `),
  Rockets90s(1997, `
    Hakeem Olajuwon|C|92|34|unicorn
    Charles Barkley|PF|86|34|slasher
    Clyde Drexler|SG|84|34|slasher
    Kevin Willis|PF|76|34|big
    Mario Elie|SG/SF|75|33|wing3d
    Matt Maloney|PG|74|25|shooter
    Eddie Johnson|SF|72|37|scorer
    Brent Price|PG|70|28|shooter
  `),
  Rockets(2015, `
    James Harden|SG|94|25|scorer
    Dwight Howard|C|82|29|rim|50
    Trevor Ariza|SF|77|29|wing3d
    Donatas Motiejūnas|PF|76|24|big
    Terrence Jones|PF|74|23|big
    Patrick Beverley|PG|74|26|defender
    Corey Brewer|SF|74|28|defender
    Josh Smith|PF|74|29|big
    Jason Terry|PG|74|37|shooter
  `),
  Spurs(1983, `
    George Gervin|SG/SF|90|30|scorer
    Artis Gilmore|C|86|33|big
    Mike Mitchell|SF|82|27|scorer
    Johnny Moore|PG|78|25|playmaker
    Gene Banks|SF|76|23|slasher
    Mark Olberding|PF|72|26|big
    Edgar Jones|PF|70|26|rim|?
  `),
  Spurs(1990, `
    David Robinson|C|90|24|unicorn
    Terry Cummings|PF|82|28|scorer
    Willie Anderson|SG|78|23|scorer
    Rod Strickland|PG|76|23|playmaker
    Sean Elliott|SF|72|21|shooter
    Frank Brickowski|PF/C|72|30|big
    David Wingate|SG|70|26|defender
    Caldwell Jones|C|68|39|defender|?
  `),
  Warriors(1987, `
    Sleepy Floyd|PG|84|26|scorer
    Joe Barry Carroll|C|82|28|big
    Purvis Short|SF|80|29|scorer
    Chris Mullin|SG/SF|78|23|shooter
    Larry Smith|PF|74|29|big
    Terry Teagle|SG|72|26|scorer
    Greg Ballard|SF|70|32|scorer|?
  `),
  Warriors(1994, `
    Latrell Sprewell|SG|87|23|slasher
    Chris Webber|PF|86|20|point
    Chris Mullin|SF|82|30|shooter|40
    Billy Owens|SF|78|24|slasher
    Avery Johnson|PG|76|28|playmaker
    Chris Gatling|PF|74|26|big
    Victor Alexander|C|72|24|big
  `),
  Heat(1992, `
    Glen Rice|SF|82|24|shooter
    Rony Seikaly|C|80|26|big
    Steve Smith|SG|76|23|shooter
    Grant Long|PF|76|26|defender
    Bimbo Coles|PG|74|23|defender
    Kevin Edwards|SG|74|26|scorer
    Willie Burton|SF|72|23|scorer
    Brian Shaw|PG|72|25|playmaker|?
  `),
  Knicks(1993, `
    Patrick Ewing|C|93|30|big
    Charles Oakley|PF|81|29|big
    John Starks|SG|80|27|scorer
    Anthony Mason|PF|77|26|defender
    Charles Smith|PF|75|27|big
    Doc Rivers|PG|74|31|defender
    Rolando Blackman|SG|74|34|scorer
    Tony Campbell|SF|72|30|scorer
    Greg Anthony|PG|70|25|defender
  `),
  Sixers(1985, `
    Moses Malone|C|91|29|big
    Julius Erving|SF|86|34|slasher
    Andrew Toney|SG|82|27|scorer
    Maurice Cheeks|PG|82|28|defender
    Charles Barkley|PF|80|21|slasher
    Bobby Jones|PF|76|33|defender
    Clemon Johnson|C|70|28|big
    Sedale Threatt|PG|70|23|scorer
  `),
];
