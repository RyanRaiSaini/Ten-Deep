import { season } from './build';

const C: [string, string] = ['#552583', '#FDB927'];
const L = (y: number, r: string) => season('lal', 'Los Angeles', 'Lakers', y, C, r);

export const lakers = [
  L(1962, `
    Elgin Baylor|SF|95|27|scorer
    Jerry West|SG/PG|93|23|scorer
    Rudy LaRusso|PF|80|24|big
    Frank Selvy|SG|76|29|shooter
    Rod Hundley|PG|74|27|playmaker
    Jim Krebs|C|74|26|big
    Tom Hawkins|SF|73|25|slasher
    Ray Felix|C|72|31|rim
  `),
  L(1972, `
    Jerry West|PG/SG|95|33|playmaker
    Wilt Chamberlain|C|93|35|rim
    Gail Goodrich|SG|88|28|scorer
    Happy Hairston|PF|81|29|big
    Jim McMillian|SF|80|23|scorer
    Pat Riley|SG|72|26|shooter
    Flynn Robinson|PG|72|30|scorer
    LeRoy Ellis|C|72|31|big
  `),
  L(1980, `
    Kareem Abdul-Jabbar|C|96|32|unicorn
    Magic Johnson|PG|89|20|point
    Jamaal Wilkes|SF|86|26|scorer
    Norm Nixon|PG/SG|84|24|playmaker
    Michael Cooper|SG/SF|79|23|defender
    Spencer Haywood|PF|78|30|scorer
    Jim Chones|C/PF|78|30|big
    Mark Landsberger|PF|72|24|big
  `),
  L(1985, `
    Magic Johnson|PG|95|25|point
    Kareem Abdul-Jabbar|C|91|37|unicorn
    James Worthy|SF|87|23|slasher
    Byron Scott|SG|82|23|shooter
    Michael Cooper|SG/SF|80|28|defender
    Bob McAdoo|PF/C|79|33|scorer
    Kurt Rambis|PF|74|26|defender
    Mitch Kupchak|C/PF|72|30|big
  `),
  L(1987, `
    Magic Johnson|PG|98|27|point
    James Worthy|SF|89|25|slasher
    Kareem Abdul-Jabbar|C|88|39|unicorn
    Byron Scott|SG|84|25|shooter
    Michael Cooper|SG/SF|81|30|defender
    A.C. Green|PF|80|23|big
    Mychal Thompson|C/PF|78|32|big
    Kurt Rambis|PF|73|28|defender
  `),
  L(1991, `
    Magic Johnson|PG|94|31|point
    James Worthy|SF|88|29|slasher
    Vlade Divac|C|80|22|point
    Sam Perkins|PF/C|79|29|stretch
    A.C. Green|PF|79|27|big
    Byron Scott|SG|80|29|shooter
    Terry Teagle|SG/SF|74|30|scorer
    Elden Campbell|PF/C|72|22|rim
  `),
  L(2000, `
    Shaquille O'Neal|C|99|28|rim
    Kobe Bryant|SG|92|21|scorer
    Glen Rice|SF|84|32|shooter
    Robert Horry|PF|79|29|stretch
    Rick Fox|SF|78|30|twoway
    Ron Harper|PG/SG|77|36|defender
    Derek Fisher|PG|76|25|shooter
    Brian Shaw|PG|72|33|playmaker
    A.C. Green|PF|72|36|big
  `),
  L(2002, `
    Shaquille O'Neal|C|98|29|rim
    Kobe Bryant|SG|95|23|scorer
    Rick Fox|SF|78|32|twoway
    Robert Horry|PF|79|31|stretch
    Derek Fisher|PG|77|27|shooter
    Lindsey Hunter|PG|72|31|defender
    Devean George|SF|72|24|wing3d
    Samaki Walker|PF|70|25|big
  `),
  L(2006, `
    Kobe Bryant|SG|97|27|scorer
    Lamar Odom|PF/SF|84|26|point
    Luke Walton|SF|73|25|playmaker
    Smush Parker|PG|73|24|slasher
    Kwame Brown|C|72|23|big
    Chris Mihm|C|72|26|big
    Brian Cook|PF|70|25|stretch
    Devean George|SF|71|28|wing3d
  `),
  L(2009, `
    Kobe Bryant|SG|96|30|scorer
    Pau Gasol|PF/C|90|28|point
    Lamar Odom|PF/SF|84|29|point
    Andrew Bynum|C|82|21|rim|45
    Trevor Ariza|SF|79|23|wing3d
    Derek Fisher|PG|76|34|shooter
    Sasha Vujačić|SG|72|24|shooter
    Jordan Farmar|PG|72|22|scorer
    Luke Walton|SF|72|28|playmaker
  `),
  L(2010, `
    Kobe Bryant|SG|95|31|scorer
    Pau Gasol|PF/C|91|29|point
    Andrew Bynum|C|83|22|rim|45
    Lamar Odom|PF/SF|83|30|point
    Ron Artest|SF|82|30|defender
    Derek Fisher|PG|74|35|shooter
    Shannon Brown|SG|73|24|slasher
  `),
  L(2020, `
    LeBron James|SF/PG|95|35|point
    Anthony Davis|PF/C|95|26|unicorn
    Kentavious Caldwell-Pope|SG|78|26|wing3d
    Danny Green|SG/SF|77|32|wing3d
    Kyle Kuzma|PF|77|24|scorer
    Rajon Rondo|PG|76|33|playmaker
    Alex Caruso|PG/SG|76|25|defender
    Dwight Howard|C|76|34|rim
    JaVale McGee|C|75|32|rim
    Markieff Morris|PF|72|30|stretch
  `),
];
