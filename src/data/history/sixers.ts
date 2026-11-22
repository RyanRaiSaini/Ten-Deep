import { season } from './build';

const C: [string, string] = ['#006BB6', '#ED174C'];
const P = (y: number, r: string) => season('phi', 'Philadelphia', '76ers', y, C, r);

export const sixers = [
  P(1967, `
    Wilt Chamberlain|C|99|30|rim
    Hal Greer|SG|88|30|scorer
    Billy Cunningham|SF|85|23|slasher
    Chet Walker|SF/PF|84|26|scorer
    Luke Jackson|PF|78|25|big
    Wali Jones|PG|77|24|defender
    Larry Costello|PG|74|35|playmaker
  `),
  P(1977, `
    Julius Erving|SF|95|26|slasher
    George McGinnis|PF|86|26|big
    Doug Collins|SG|84|25|scorer
    World B. Free|SG|82|23|scorer
    Darryl Dawkins|C|78|20|rim
    Caldwell Jones|C/PF|78|26|defender
    Steve Mix|PF|75|29|big
    Henry Bibby|PG|74|27|playmaker
  `),
  P(1983, `
    Moses Malone|C|96|27|big
    Julius Erving|SF|93|32|slasher
    Maurice Cheeks|PG|84|26|defender
    Andrew Toney|SG|84|25|scorer
    Bobby Jones|PF|82|31|defender
    Clint Richardson|SG|72|26|wing3d
    Marc Iavaroni|PF|72|26|defender
    Earl Cureton|PF/C|70|25|big
  `),
  P(1990, `
    Charles Barkley|PF|95|26|slasher
    Hersey Hawkins|SG|82|23|shooter
    Johnny Dawkins|PG|78|26|playmaker
    Rick Mahorn|PF|77|31|defender
    Ron Anderson|SF|76|31|scorer
    Mike Gminski|C|75|30|big
    Scott Brooks|PG|70|24|shooter
  `),
  P(2001, `
    Allen Iverson|SG/PG|94|25|scorer
    Dikembe Mutombo|C|86|34|rim
    Theo Ratliff|C|82|27|rim
    Aaron McKie|SG|78|28|twoway
    Eric Snow|PG|77|27|defender
    Tyrone Hill|PF|75|32|big
    George Lynch|SF|74|30|defender
    Jumaine Jones|SF|70|21|wing3d
  `),
  P(2018, `
    Joel Embiid|C|90|23|scorer|40
    Ben Simmons|PG|85|21|point
    JJ Redick|SG|80|33|shooter
    Robert Covington|SF/PF|79|27|wing3d
    Dario Šarić|PF|77|23|stretch
    Marco Belinelli|SG|75|31|shooter
    Ersan İlyasova|PF|74|30|stretch
    Amir Johnson|PF/C|72|30|rim
  `),
  P(2023, `
    Joel Embiid|C|96|28|scorer|40
    James Harden|PG|88|33|playmaker
    Tobias Harris|PF|81|30|twoway
    De'Anthony Melton|SG|77|24|defender
    Georges Niang|PF|75|29|shooter
    P.J. Tucker|PF|74|37|defender
    Shake Milton|PG|74|26|scorer
    Paul Reed|C|72|23|big
  `),
];
