import { season } from './build';

type Colors = [string, string];
const team = (franchise: string, city: string, name: string, colors: Colors) => (y: number, r: string) =>
  season(franchise, city, name, y, colors, r);

const Suns = team('phx', 'Phoenix', 'Suns', ['#1D1160', '#E56020']);
const Mavs = team('dal', 'Dallas', 'Mavericks', ['#00538C', '#B8C4CA']);
const Thunder = team('okc', 'Oklahoma City', 'Thunder', ['#007AC1', '#EF3B24']);
const Sonics = team('okc', 'Seattle', 'SuperSonics', ['#00653A', '#FFC200']);
const Jazz = team('uta', 'Utah', 'Jazz', ['#002B5C', '#F9A01B']);
const Magic = team('orl', 'Orlando', 'Magic', ['#0077C0', '#C4CED4']);
const Kings = team('sac', 'Sacramento', 'Kings', ['#5A2D81', '#63727A']);
const Royals = team('sac', 'Cincinnati', 'Royals', ['#002D62', '#C8102E']);
const Pacers = team('ind', 'Indiana', 'Pacers', ['#002D62', '#FDBB30']);
const Nets = team('bkn', 'New Jersey', 'Nets', ['#000000', '#FFFFFF']);
const Raptors = team('tor', 'Toronto', 'Raptors', ['#CE1141', '#000000']);
const Bucks = team('mil', 'Milwaukee', 'Bucks', ['#00471B', '#EEE1C6']);
const Nuggets = team('den', 'Denver', 'Nuggets', ['#0E2240', '#FEC524']);
const Blazers = team('por', 'Portland', 'Trail Blazers', ['#E03A3E', '#000000']);
const Cavs = team('cle', 'Cleveland', 'Cavaliers', ['#860038', '#FDBB30']);
const Clippers = team('lac', 'Los Angeles', 'Clippers', ['#C8102E', '#1D428A']);
const Wolves = team('min', 'Minnesota', 'Timberwolves', ['#0C2340', '#78BE20']);
const Grizzlies = team('mem', 'Memphis', 'Grizzlies', ['#5D76A9', '#12173F']);
const Hawks = team('atl', 'Atlanta', 'Hawks', ['#C8102E', '#FDB927']);
const Hornets = team('nop', 'New Orleans', 'Hornets', ['#0C2340', '#C8102E']);
const Pelicans = team('nop', 'New Orleans', 'Pelicans', ['#0C2340', '#C8102E']);

export const others = [
  Royals(1962, `
    Oscar Robertson|PG|97|23|point
    Jack Twyman|SF|84|28|scorer
    Wayne Embry|C|82|24|big
    Bob Boozer|PF|76|24|big
    Arlen Bockhorn|SG|74|28|defender
    Adrian Smith|PG|74|25|shooter
  `),
  Bucks(1971, `
    Kareem Abdul-Jabbar|C|98|23|unicorn
    Oscar Robertson|PG|89|32|point
    Bob Dandridge|SF|83|23|scorer
    Jon McGlocklin|SG|78|27|shooter
    Greg Smith|PF|74|23|defender
    Lucius Allen|PG|74|23|scorer
    Dick Cunningham|C|70|24|big
  `),
  Blazers(1977, `
    Bill Walton|C|95|24|point|40
    Maurice Lucas|PF|87|25|big
    Lionel Hollins|PG|80|23|defender
    Bob Gross|SF|76|23|wing3d
    Dave Twardzik|PG|75|26|playmaker
    Johnny Davis|SG|74|21|scorer
    Lloyd Neal|PF|72|26|big
  `),
  Nuggets(1983, `
    Alex English|SF|89|29|scorer
    Kiki Vandeweghe|SF|86|24|scorer
    Dan Issel|C|84|34|big
    T.R. Dunn|SG|72|27|defender
    Dan Schayes|C|72|23|big
    Bill Hanzlik|SG|72|25|defender
  `),
  Hawks(1986, `
    Dominique Wilkins|SF|93|26|slasher
    Kevin Willis|PF|80|23|big
    Doc Rivers|PG|80|24|defender
    Tree Rollins|C|76|30|rim
    Randy Wittman|SG|74|26|shooter
    Spud Webb|PG|74|23|slasher
  `),
  Blazers(1992, `
    Clyde Drexler|SG|94|29|slasher
    Terry Porter|PG|85|28|shooter
    Jerome Kersey|SF|80|29|slasher
    Buck Williams|PF|80|31|big
    Clifford Robinson|PF/C|79|25|stretch
    Kevin Duckworth|C|77|27|big
    Robert Pack|PG|70|22|slasher
  `),
  Suns(1993, `
    Charles Barkley|PF|97|29|slasher
    Kevin Johnson|PG|88|26|playmaker
    Dan Majerle|SF/SG|80|27|wing3d
    Tom Chambers|PF|80|33|scorer
    Cedric Ceballos|SF|77|23|scorer
    Danny Ainge|SG|76|33|shooter
    Richard Dumas|SF|74|23|slasher
    Mark West|C|72|32|rim
    Oliver Miller|C|72|22|big
  `),
  Magic(1995, `
    Shaquille O'Neal|C|95|22|rim
    Penny Hardaway|PG|92|23|playmaker
    Horace Grant|PF|82|29|defender
    Nick Anderson|SG|82|27|shooter
    Dennis Scott|SF|80|26|shooter
    Brian Shaw|PG|72|28|playmaker
    Donald Royal|SF|70|29|defender
  `),
  Sonics(1996, `
    Gary Payton|PG|94|27|twoway
    Shawn Kemp|PF|92|26|slasher
    Detlef Schrempf|SF|84|33|stretch
    Hersey Hawkins|SG|80|29|shooter
    Sam Perkins|PF/C|78|34|stretch
    Nate McMillan|PG|76|31|defender
    Ervin Johnson|C|72|28|rim
    Vincent Askew|SG|72|29|defender
  `),
  Jazz(1997, `
    Karl Malone|PF|96|33|big
    John Stockton|PG|91|34|playmaker
    Jeff Hornacek|SG|82|33|shooter
    Bryon Russell|SF|77|26|wing3d
    Antoine Carr|PF|74|35|big
    Greg Ostertag|C|74|24|rim
    Shandon Anderson|SG|74|23|slasher
    Howard Eisley|PG|72|24|playmaker
  `),
  Hawks(1997, `
    Dikembe Mutombo|C|89|30|rim
    Steve Smith|SG|84|27|shooter
    Mookie Blaylock|PG|82|29|defender
    Christian Laettner|PF|80|27|stretch
    Tyrone Corbin|SF|72|34|defender
    Alan Henderson|PF|72|24|big
  `),
  Pacers(2000, `
    Reggie Miller|SG|89|34|shooter
    Jalen Rose|SF|84|27|scorer
    Rik Smits|C|81|33|big
    Dale Davis|PF|80|30|rim
    Mark Jackson|PG|80|34|playmaker
    Austin Croshere|PF|76|24|stretch
    Travis Best|PG|74|27|scorer
    Chris Mullin|SF|74|36|shooter
  `),
  Nets(2002, `
    Jason Kidd|PG|94|28|playmaker
    Kenyon Martin|PF|82|24|defender
    Kerry Kittles|SG|79|27|wing3d
    Keith Van Horn|SF/PF|79|26|scorer
    Richard Jefferson|SF|78|21|slasher
    Todd MacCulloch|C|74|26|big
    Lucious Harris|SG|72|31|shooter
    Aaron Williams|PF/C|70|30|big
  `),
  Kings(2002, `
    Chris Webber|PF|92|28|point
    Peja Stojaković|SF|88|24|shooter
    Mike Bibby|PG|84|23|scorer
    Vlade Divac|C|82|33|point
    Doug Christie|SG|81|31|defender
    Bobby Jackson|PG|79|28|scorer
    Hedo Türkoğlu|SF|74|22|playmaker
    Scot Pollard|C|74|27|rim
  `),
  Magic(2003, `
    Tracy McGrady|SG/SF|96|23|scorer
    Mike Miller|SF|77|22|shooter
    Drew Gooden|PF|76|21|big
    Darrell Armstrong|PG|76|34|defender
    Gordan Giriček|SG|75|25|shooter
    Pat Garrity|PF|72|26|stretch
  `),
  Wolves(2004, `
    Kevin Garnett|PF|97|27|unicorn
    Sam Cassell|PG|86|34|scorer
    Latrell Sprewell|SG/SF|81|33|slasher
    Wally Szczerbiak|SF|79|26|shooter
    Fred Hoiberg|SG|74|31|shooter
    Trenton Hassell|SF|74|24|defender
    Mark Madsen|PF|70|28|defender
  `),
  Suns(2005, `
    Steve Nash|PG|94|31|playmaker
    Amar'e Stoudemire|PF/C|91|22|slasher
    Shawn Marion|SF/PF|87|26|twoway
    Joe Johnson|SG|82|23|scorer
    Quentin Richardson|SF|76|24|shooter
    Leandro Barbosa|SG|77|22|slasher
    Jim Jackson|SF|74|34|scorer
    Steven Hunter|C|70|23|rim
  `),
  Mavs(2007, `
    Dirk Nowitzki|PF|95|28|stretch
    Jason Terry|SG/PG|82|29|scorer
    Josh Howard|SF|81|26|twoway
    Devin Harris|PG|78|23|slasher
    Jerry Stackhouse|SG|77|32|scorer
    Erick Dampier|C|75|31|rim
    DeSagana Diop|C|70|25|rim
  `),
  Hornets(2008, `
    Chris Paul|PG|96|22|playmaker
    David West|PF|83|27|big
    Tyson Chandler|C|80|25|rim
    Peja Stojaković|SF|80|30|shooter
    Morris Peterson|SG|74|30|wing3d
    Jannero Pargo|PG|72|28|scorer
    Rasual Butler|SF|72|28|shooter
  `),
  Cavs(2009, `
    LeBron James|SF/PF|98|24|point
    Mo Williams|PG|82|26|scorer
    Zydrunas Ilgauskas|C|79|33|big
    Delonte West|SG|77|25|twoway
    Anderson Varejão|PF/C|77|26|big
    Ben Wallace|C|72|34|defender
    Wally Szczerbiak|SF|72|31|shooter
    Daniel Gibson|PG|72|22|shooter
  `),
  Magic(2009, `
    Dwight Howard|C|93|23|rim
    Hedo Türkoğlu|SF|82|29|playmaker
    Rashard Lewis|PF|82|29|stretch
    Jameer Nelson|PG|82|26|scorer|45
    Rafer Alston|PG|75|32|playmaker
    Mickaël Piétrus|SF|74|26|wing3d
    Courtney Lee|SG|74|23|wing3d
    Marcin Gortat|C|74|24|rim
  `),
  Mavs(2011, `
    Dirk Nowitzki|PF|94|32|stretch
    Tyson Chandler|C|84|28|rim
    Jason Terry|SG/PG|81|33|scorer
    Shawn Marion|SF/PF|80|32|twoway
    Jason Kidd|PG|80|37|playmaker
    J.J. Barea|PG|75|26|scorer
    Peja Stojaković|SF|74|33|shooter
    DeShawn Stevenson|SG|72|29|defender
    Brendan Haywood|C|72|31|rim
  `),
  Thunder(2012, `
    Kevin Durant|SF|92|23|scorer
    Russell Westbrook|PG|89|23|slasher
    James Harden|SG|84|22|scorer
    Serge Ibaka|PF/C|83|22|rim
    Kendrick Perkins|C|75|27|rim
    Thabo Sefolosha|SG/SF|76|27|defender
    Nick Collison|PF|74|31|defender
    Derek Fisher|PG|74|37|shooter
  `),
  Grizzlies(2013, `
    Marc Gasol|C|88|28|point
    Zach Randolph|PF|86|31|big
    Mike Conley|PG|83|25|playmaker
    Tony Allen|SG|80|31|defender
    Tayshaun Prince|SF|76|32|defender
    Quincy Pondexter|SF|72|25|wing3d
    Jerryd Bayless|PG|72|24|scorer
  `),
  Clippers(2014, `
    Chris Paul|PG|94|28|playmaker
    Blake Griffin|PF|89|24|slasher
    DeAndre Jordan|C|83|25|rim
    Jamal Crawford|SG|80|33|scorer
    J.J. Redick|SG|79|29|shooter
    Darren Collison|PG|76|26|scorer
    Matt Barnes|SF|75|33|twoway
    Jared Dudley|SF|72|28|wing3d
  `),
  Wolves(2014, `
    Kevin Love|PF|90|25|stretch
    Kevin Martin|SG|80|31|scorer
    Ricky Rubio|PG|79|23|playmaker
    Nikola Peković|C|79|28|big
    Corey Brewer|SF|75|27|defender
    J.J. Barea|PG|73|29|scorer
    Gorgui Dieng|C|72|24|rim
    Chase Budinger|SF|72|25|shooter
  `),
  Pacers(2014, `
    Paul George|SF|89|23|twoway
    Roy Hibbert|C|82|27|rim
    David West|PF|81|33|big
    Lance Stephenson|SG|80|23|slasher
    George Hill|PG|79|27|twoway
    Luis Scola|PF|74|33|big
    Evan Turner|SF|74|25|playmaker
    C.J. Watson|PG|72|29|scorer
  `),
  Cavs(2016, `
    LeBron James|SF/PF|98|31|point
    Kyrie Irving|PG|89|23|scorer
    Kevin Love|PF|85|27|stretch
    J.R. Smith|SG|78|30|shooter
    Tristan Thompson|C|77|25|big
    Iman Shumpert|SG|74|25|defender
    Richard Jefferson|SF|74|35|wing3d
    Channing Frye|PF|74|32|stretch
    Matthew Dellavedova|PG|72|25|defender
  `),
  Thunder(2017, `
    Russell Westbrook|PG|96|28|slasher
    Steven Adams|C|80|23|rim
    Victor Oladipo|SG|79|24|twoway
    Enes Kanter|C|77|24|big
    Andre Roberson|SF|76|25|defender
    Taj Gibson|PF|76|31|defender
    Jerami Grant|PF|74|22|defender
  `),
  Pelicans(2018, `
    Anthony Davis|PF/C|94|24|unicorn
    DeMarcus Cousins|C|90|27|big|30
    Jrue Holiday|PG/SG|84|27|defender
    Rajon Rondo|PG|76|31|playmaker
    E'Twaun Moore|SG|76|28|shooter
    Nikola Mirotić|PF|77|26|stretch
    Ian Clark|SG|72|26|scorer
  `),
  Thunder(2019, `
    Paul George|SF|93|28|twoway
    Russell Westbrook|PG|90|30|slasher
    Steven Adams|C|80|25|rim
    Jerami Grant|PF|78|24|defender
    Dennis Schröder|PG|79|25|scorer
    Terrance Ferguson|SG|72|20|wing3d
    Nerlens Noel|C|72|24|rim
  `),
  Raptors(2019, `
    Kawhi Leonard|SF|96|27|twoway
    Kyle Lowry|PG|87|32|playmaker
    Pascal Siakam|PF|85|24|slasher
    Marc Gasol|C|82|34|point
    Serge Ibaka|PF/C|79|29|stretch
    Danny Green|SG/SF|78|31|wing3d
    Fred VanVleet|PG|79|24|shooter
    Norman Powell|SG|74|25|slasher
    OG Anunoby|SF|76|21|defender
  `),
  Bucks(2021, `
    Giannis Antetokounmpo|PF|97|26|slasher
    Khris Middleton|SF|86|29|scorer
    Jrue Holiday|PG/SG|85|30|defender
    Brook Lopez|C|80|33|stretch
    Bobby Portis|PF|78|26|stretch
    Donte DiVincenzo|SG|76|24|twoway
    P.J. Tucker|PF|75|36|defender
    Pat Connaughton|SG|74|28|wing3d
    Bryn Forbes|SG|73|27|shooter
  `),
  Suns(2021, `
    Chris Paul|PG|88|35|playmaker
    Devin Booker|SG|87|24|scorer
    DeAndre Ayton|C|82|22|big
    Mikal Bridges|SF|80|24|wing3d
    Cameron Johnson|PF|77|25|shooter
    Jae Crowder|PF|76|30|wing3d
    Dario Šarić|PF|74|27|stretch
    Cameron Payne|PG|74|26|scorer
  `),
  Blazers(2021, `
    Damian Lillard|PG|93|30|scorer
    CJ McCollum|SG|85|29|scorer
    Jusuf Nurkić|C|79|26|big
    Robert Covington|PF|76|30|wing3d
    Carmelo Anthony|SF|76|36|scorer
    Enes Kanter|C|75|28|big
    Anfernee Simons|SG|75|21|shooter
  `),
  Nuggets(2023, `
    Nikola Jokić|C|98|28|point
    Jamal Murray|PG|87|26|scorer
    Aaron Gordon|PF|82|27|twoway
    Michael Porter Jr.|SF|82|24|shooter
    Kentavious Caldwell-Pope|SG|78|30|wing3d
    Bruce Brown|SG|77|26|defender
    Christian Braun|SG|72|21|defender
    Jeff Green|PF|72|36|stretch
  `),
  Mavs(2024, `
    Luka Dončić|PG|97|25|scorer
    Kyrie Irving|PG/SG|88|31|scorer
    Dereck Lively II|C|78|20|rim
    Daniel Gafford|C|78|25|rim
    Derrick Jones Jr.|SF|77|27|defender
    P.J. Washington|PF|78|25|defender
    Tim Hardaway Jr.|SG|76|31|shooter
    Josh Green|SG|74|23|wing3d
    Maxi Kleber|PF/C|74|32|stretch
  `),
];
