import { season } from './build';

const C: [string, string] = ['#CE1141', '#000000'];
const B = (y: number, r: string) => season('chi', 'Chicago', 'Bulls', y, C, r);

export const bulls = [
  B(1974, `
    Bob Love|SF|85|31|scorer
    Chet Walker|SF/PF|84|33|scorer
    Norm Van Lier|PG|82|26|defender
    Jerry Sloan|SG|82|31|defender
    Clifford Ray|C|78|25|rim
    Tom Boerwinkle|C|76|28|point
    Bob Weiss|PG|74|31|playmaker
  `),
  B(1988, `
    Michael Jordan|SG|97|24|scorer
    Charles Oakley|PF|82|24|big
    Scottie Pippen|SF|78|22|twoway
    Horace Grant|PF|75|22|defender
    John Paxson|PG|74|27|shooter
    Sam Vincent|PG|72|24|playmaker
    Dave Corzine|C|72|31|big
    Brad Sellers|SF|70|25|scorer
  `),
  B(1991, `
    Michael Jordan|SG|99|27|scorer
    Scottie Pippen|SF|89|25|twoway
    Horace Grant|PF|82|25|defender
    Bill Cartwright|C|77|33|big
    John Paxson|PG|76|30|shooter
    B.J. Armstrong|PG|75|23|shooter
    Craig Hodges|SG|74|30|shooter
    Stacey King|PF|72|23|big
    Cliff Levingston|PF|70|30|defender
  `),
  B(1993, `
    Michael Jordan|SG|98|29|scorer
    Scottie Pippen|SF|91|27|twoway
    Horace Grant|PF|84|27|defender
    B.J. Armstrong|PG|79|25|shooter
    Bill Cartwright|C|74|35|big
    John Paxson|PG|74|32|shooter
    Scott Williams|PF/C|72|24|big
    Stacey King|PF|72|25|big
  `),
  B(1996, `
    Michael Jordan|SG|98|32|scorer
    Scottie Pippen|SF|92|30|twoway
    Dennis Rodman|PF|86|34|defender
    Toni Kukoč|SF/PF|85|27|point
    Ron Harper|PG/SG|79|32|defender
    Steve Kerr|PG|77|30|shooter
    Luc Longley|C|76|27|big
    Bill Wennington|C|70|32|stretch
    Jud Buechler|SF|68|27|wing3d
  `),
  B(1998, `
    Michael Jordan|SG|96|34|scorer
    Scottie Pippen|SF|89|32|twoway
    Toni Kukoč|SF/PF|84|29|point
    Dennis Rodman|PF|82|36|defender
    Ron Harper|PG/SG|76|34|defender
    Steve Kerr|PG|75|32|shooter
    Luc Longley|C|75|29|big
    Scott Burrell|SF|70|27|wing3d
  `),
  B(2011, `
    Derrick Rose|PG|94|22|slasher
    Luol Deng|SF|84|25|twoway
    Joakim Noah|C|84|26|defender
    Carlos Boozer|PF|82|29|big
    Kyle Korver|SG|78|29|shooter
    Taj Gibson|PF|78|25|defender
    Ronnie Brewer|SG|75|26|defender
    C.J. Watson|PG|72|26|scorer
    Kurt Thomas|C|70|38|big
  `),
  B(2015, `
    Jimmy Butler|SG/SF|86|25|twoway
    Pau Gasol|C/PF|85|34|point
    Joakim Noah|C|84|29|point
    Derrick Rose|PG|82|26|slasher|30
    Taj Gibson|PF|78|29|defender
    Nikola Mirotić|PF|77|23|stretch
    Mike Dunleavy|SF|76|34|shooter
    Aaron Brooks|PG|74|30|scorer
    Tony Snell|SF|70|23|wing3d
  `),
];
