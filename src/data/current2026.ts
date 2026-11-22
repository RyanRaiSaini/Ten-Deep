/**
 * CURRENT DAY — 2026-27 pool.
 *
 * ⚠️ OWNER REVIEW: rosters reflect the most recent moves known as of mid-2026. Anything after that
 * (2026 free agency, trades, the 2026 draft's team assignments) needs checking. Lines ending in `?` are moves
 * we're least sure of; they're flagged in docs/ratings-review/current-2026.md.
 *
 * Ratings are original Ten Deep numbers (64–99), age-adjusted for the 2026-27 season.
 * Format: Name|POS[/POS2]|ovr|age|archetype[|durability][|?]
 */
import type { Pool } from '../engine/types';
import { team } from './build';

const S = '2026-27';

export const current2026: Pool = {
  id: 'current-2026',
  label: 'Current Day',
  teams: [
    team('atl', 'Atlanta', 'Hawks', S, ['#C8102E', '#FDB927'], `
      Jalen Johnson|SF/PF|88|24|twoway|70
      Dyson Daniels|SG/PG|82|23|defender
      Kristaps Porziņģis|C/PF|81|31|stretch|40
      Onyeka Okongwu|C/PF|80|25|rim
      Nickeil Alexander-Walker|SG/SF|79|28|wing3d
      CJ McCollum|SG/PG|79|35|scorer|70|?
      Zaccharie Risacher|SF|78|21|wing3d
      Corey Kispert|SF/SG|75|27|shooter|80|?
      Luke Kennard|SG|75|30|shooter
      Vít Krejčí|SG/SF|72|26|shooter
      Asa Newell|PF/C|72|20|big
      Kobe Bufkin|PG|70|23|scorer
      Mouhamed Gueye|PF/C|70|23|rim
    `),
    team('bos', 'Boston', 'Celtics', S, ['#007A33', '#BA9653'], `
      Jayson Tatum|SF/PF|90|28|twoway|60
      Jaylen Brown|SG/SF|89|30|slasher
      Derrick White|PG/SG|84|32|wing3d
      Payton Pritchard|PG|81|28|shooter
      Anfernee Simons|SG/PG|80|27|scorer
      Sam Hauser|SF|76|28|shooter
      Neemias Queta|C|75|27|rim
      Jordan Walsh|SF/SG|72|22|defender
      Josh Minott|PF/SF|70|24|defender
      Baylor Scheierman|SG|70|26|shooter
      Hugo González|SF|70|20|wing3d
      Xavier Tillman|C/PF|70|27|big
      Luka Garza|C|69|27|big
    `),
    team('bkn', 'Brooklyn', 'Nets', S, ['#000000', '#FFFFFF'], `
      Michael Porter Jr.|SF/PF|83|28|scorer|55
      Cam Thomas|SG|80|25|scorer
      Nic Claxton|C|79|27|rim
      Terance Mann|SG/SF|74|30|twoway
      Egor Demin|PG|74|20|playmaker
      Noah Clowney|PF|74|22|stretch
      Day'Ron Sharpe|C|73|25|big
      Haywood Highsmith|SF/PF|72|30|defender
      Ziaire Williams|SF|72|25|wing3d
      Nolan Traoré|PG|70|20|slasher
      Drake Powell|SG/SF|70|21|wing3d
      Danny Wolf|C/PF|70|22|stretch
      Ben Saraf|PG|69|20|playmaker
    `),
    team('cha', 'Charlotte', 'Hornets', S, ['#1D1160', '#00788C'], `
      LaMelo Ball|PG|86|25|playmaker|50
      Brandon Miller|SF/SG|86|24|scorer
      Miles Bridges|PF/SF|81|28|slasher
      Kon Knueppel|SG/SF|80|21|shooter
      Collin Sexton|PG/SG|78|27|scorer
      Moussa Diabaté|C|74|24|rim
      Tre Mann|PG|73|25|scorer
      Grant Williams|PF|72|27|stretch
      Josh Green|SG|72|25|wing3d
      Ryan Kalkbrenner|C|72|24|rim
      Liam McNeeley|SF|70|20|shooter
      Sion James|SG|69|23|defender
      Tidjane Salaün|PF|68|21|stretch
    `),
    team('chi', 'Chicago', 'Bulls', S, ['#CE1141', '#000000'], `
      Josh Giddey|PG|84|24|playmaker
      Coby White|PG/SG|82|26|scorer
      Matas Buzelis|SF/PF|80|22|unicorn
      Nikola Vučević|C|79|36|big|68
      Ayo Dosunmu|SG/PG|77|26|twoway
      Kevin Huerter|SG|74|28|shooter
      Patrick Williams|PF|74|25|defender
      Tre Jones|PG|74|26|playmaker
      Jalen Smith|C/PF|73|26|big
      Isaac Okoro|SF|72|25|defender
      Zach Collins|C|71|28|big
      Noa Essengue|PF|70|20|slasher
      Julian Phillips|SF|69|23|defender
    `),
    team('cle', 'Cleveland', 'Cavaliers', S, ['#860038', '#FDBB30'], `
      Donovan Mitchell|SG|92|30|scorer
      Evan Mobley|PF/C|89|25|unicorn
      James Harden|PG|86|37|playmaker|70|?
      Jarrett Allen|C|84|28|rim
      De'Andre Hunter|SF/PF|78|28|wing3d
      Max Strus|SF/SG|76|30|shooter
      Lonzo Ball|PG|74|28|defender|35
      Sam Merrill|SG|74|30|shooter
      Jaylon Tyson|SF|73|23|twoway
      Dean Wade|PF|72|29|defender
      Larry Nance Jr.|PF/C|71|33|big
      Craig Porter Jr.|PG|70|26|playmaker
      Tyrese Proctor|PG|67|22|shooter
    `),
    team('dal', 'Dallas', 'Mavericks', S, ['#00538C', '#B8C4CA'], `
      Cooper Flagg|SF/PF|86|19|twoway
      Kyrie Irving|PG/SG|86|34|scorer|50
      Dereck Lively II|C|80|22|rim|50
      P.J. Washington|PF|80|28|defender
      Daniel Gafford|C|78|28|rim
      Naji Marshall|SF|77|28|twoway
      Max Christie|SG|76|23|wing3d
      Klay Thompson|SG|76|36|shooter|68
      Khris Middleton|SF|76|35|scorer|50|?
      Caleb Martin|SF|73|30|defender
      Brandon Williams|PG|72|27|scorer
      Marvin Bagley III|C/PF|72|27|big|80|?
      Dwight Powell|C|69|35|rim
    `),
    team('den', 'Denver', 'Nuggets', S, ['#0E2240', '#FEC524'], `
      Nikola Jokić|C|97|31|point
      Jamal Murray|PG|87|29|scorer|60
      Aaron Gordon|PF|82|31|twoway|60
      Christian Braun|SG/SF|80|25|defender
      Cameron Johnson|SF/PF|80|30|shooter
      Peyton Watson|SF|77|24|defender
      Jonas Valančiūnas|C|76|34|big
      Bruce Brown|SG/SF|74|30|defender
      Tim Hardaway Jr.|SG|74|34|shooter
      Julian Strawther|SG|71|24|shooter
      Zeke Nnaji|PF/C|70|25|rim
      DaRon Holmes II|PF|69|24|stretch
      Jalen Pickett|PG|69|27|playmaker
    `),
    team('det', 'Detroit', 'Pistons', S, ['#C8102E', '#1D42BA'], `
      Cade Cunningham|PG|92|25|playmaker
      Jalen Duren|C|84|23|rim
      Ausar Thompson|SF/SG|82|23|defender
      Tobias Harris|PF|78|34|twoway
      Jaden Ivey|SG|78|24|slasher|60
      Isaiah Stewart|C/PF|77|25|rim
      Duncan Robinson|SF|76|32|shooter
      Ron Holland II|SF|74|21|defender
      Caris LeVert|SG|74|32|scorer
      Marcus Sasser|PG|72|26|shooter
      Paul Reed|C|71|27|big
      Javonte Green|SF|70|33|defender
      Chaz Lanier|SG|69|24|shooter
    `),
    team('gsw', 'Golden State', 'Warriors', S, ['#1D428A', '#FFC72C'], `
      Stephen Curry|PG|90|38|shooter|65
      Jimmy Butler|SF/PF|84|37|twoway|45
      Jonathan Kuminga|PF/SF|80|24|slasher
      Draymond Green|PF/C|79|36|defender|68
      Brandin Podziemski|SG|79|23|twoway
      Moses Moody|SG/SF|76|24|wing3d
      Buddy Hield|SG|75|33|shooter
      Al Horford|C/PF|75|40|stretch|60
      De'Anthony Melton|SG/PG|74|28|defender|50
      Gary Payton II|PG/SG|72|33|defender
      Quinten Post|C|71|26|stretch
      Trayce Jackson-Davis|C|70|26|rim
      Will Richard|SG|69|23|wing3d
    `),
    team('hou', 'Houston', 'Rockets', S, ['#CE1141', '#000000'], `
      Kevin Durant|SF/PF|89|38|scorer|65
      Alperen Şengün|C|88|24|point
      Amen Thompson|SG/SF|87|23|slasher
      Fred VanVleet|PG|81|32|playmaker|50
      Jabari Smith Jr.|PF|80|23|stretch
      Tari Eason|PF/SF|79|25|defender
      Reed Sheppard|PG/SG|76|22|shooter
      Dorian Finney-Smith|PF/SF|74|33|wing3d
      Steven Adams|C|74|33|rim|55
      Clint Capela|C|72|32|rim
      Aaron Holiday|PG|72|30|shooter
      Josh Okogie|SG|71|28|defender
      Jae'Sean Tate|SF|70|31|defender
    `),
    team('ind', 'Indiana', 'Pacers', S, ['#002D62', '#FDBB30'], `
      Tyrese Haliburton|PG|87|26|playmaker|60
      Pascal Siakam|PF/SF|87|32|scorer
      Andrew Nembhard|PG/SG|80|26|twoway
      Bennedict Mathurin|SG/SF|80|24|scorer
      Aaron Nesmith|SF|79|26|wing3d|60
      Obi Toppin|PF|76|28|slasher
      T.J. McConnell|PG|75|34|playmaker
      Jarace Walker|PF|73|23|twoway
      Isaiah Jackson|C|73|24|rim|55
      Ben Sheppard|SG|72|25|wing3d
      Jay Huff|C|72|28|stretch
      Johnny Furphy|SF|69|21|shooter
      Kam Jones|PG|69|24|scorer
    `),
    team('lac', 'Los Angeles', 'Clippers', S, ['#C8102E', '#1D428A'], `
      Kawhi Leonard|SF|87|35|twoway|35
      Darius Garland|PG|84|26|playmaker|60|?
      Ivica Zubac|C|83|29|rim
      John Collins|PF|79|29|slasher
      Bradley Beal|SG|77|33|scorer|50
      Derrick Jones Jr.|SF|76|29|defender
      Kris Dunn|PG/SG|75|32|defender
      Brook Lopez|C|75|38|stretch
      Bogdan Bogdanović|SG|75|34|shooter
      Nicolas Batum|PF/SF|72|37|wing3d
      Kobe Sanders|SG|70|24|twoway
      Jordan Miller|SF|69|26|slasher
      Yanic Konan Niederhäuser|C|68|23|rim
    `),
    team('lal', 'Los Angeles', 'Lakers', S, ['#552583', '#FDB927'], `
      Luka Dončić|PG|97|27|scorer
      LeBron James|SF/PF|88|41|point|60
      Austin Reaves|SG/PG|85|28|playmaker
      DeAndre Ayton|C|79|28|big
      Rui Hachimura|PF/SF|78|28|twoway
      Marcus Smart|PG/SG|76|32|defender|55
      Jake LaRavia|SF|74|24|wing3d
      Jaxson Hayes|C|73|26|rim
      Jarred Vanderbilt|PF|72|27|defender|45
      Dalton Knecht|SF/SG|72|25|shooter
      Gabe Vincent|PG|72|30|shooter
      Maxi Kleber|PF/C|70|34|stretch
      Bronny James|PG|65|21|defender
    `),
    team('mem', 'Memphis', 'Grizzlies', S, ['#5D76A9', '#12173F'], `
      Ja Morant|PG|86|27|slasher|40
      Jaren Jackson Jr.|PF/C|86|27|unicorn|80|?
      Zach Edey|C|80|24|rim|50
      Jaylen Wells|SF/SG|78|23|wing3d
      Santi Aldama|PF|77|25|stretch
      Ty Jerome|PG/SG|76|29|scorer|60
      Cedric Coward|SG/SF|75|23|wing3d
      Kentavious Caldwell-Pope|SG|75|33|wing3d
      Vince Williams Jr.|SF/SG|74|26|defender
      Brandon Clarke|PF|73|30|rim|55
      Scotty Pippen Jr.|PG|73|26|defender
      GG Jackson|PF|71|22|scorer
      Cam Spencer|SG|70|26|shooter
    `),
    team('mia', 'Miami', 'Heat', S, ['#98002E', '#F9A01B'], `
      Bam Adebayo|C/PF|85|29|twoway
      Tyler Herro|SG/PG|85|26|scorer
      Norman Powell|SG/SF|81|33|scorer
      Kel'el Ware|C|80|22|rim
      Andrew Wiggins|SF|79|31|twoway
      Jaime Jaquez Jr.|SF/SG|77|25|slasher
      Nikola Jović|PF/SF|76|23|stretch
      Davion Mitchell|PG|76|28|defender
      Simone Fontecchio|SF|73|30|shooter
      Kasparas Jakučionis|PG|72|20|playmaker
      Pelle Larsson|SG|72|25|twoway
      Dru Smith|PG|70|28|defender
      Keshad Johnson|PF|69|25|defender
    `),
    team('mil', 'Milwaukee', 'Bucks', S, ['#00471B', '#EEE1C6'], `
      Giannis Antetokounmpo|PF|95|31|slasher
      Myles Turner|C|81|30|stretch
      Kevin Porter Jr.|PG/SG|79|26|scorer
      Bobby Portis|PF/C|77|31|stretch
      Ryan Rollins|PG|76|24|twoway
      Kyle Kuzma|PF/SF|75|31|scorer
      Gary Trent Jr.|SG|74|27|shooter
      AJ Green|SG|74|27|shooter
      Taurean Prince|SF|72|32|wing3d
      Cole Anthony|PG|72|26|scorer
      Andre Jackson Jr.|SF|70|25|defender
      Gary Harris|SG|70|32|wing3d
      Jericho Sims|C|70|28|rim
    `),
    team('min', 'Minnesota', 'Timberwolves', S, ['#0C2340', '#78BE20'], `
      Anthony Edwards|SG|94|25|scorer
      Julius Randle|PF|84|31|scorer
      Rudy Gobert|C|83|34|rim
      Jaden McDaniels|SF/PF|81|26|defender
      Naz Reid|C/PF|80|27|stretch
      Donte DiVincenzo|SG/PG|77|29|shooter
      Mike Conley|PG|72|39|playmaker|65
      Rob Dillingham|PG|72|21|scorer
      Terrence Shannon Jr.|SG|72|26|slasher
      Bones Hyland|PG|72|26|scorer
      Jaylen Clark|SG|70|25|defender
      Joan Beringer|C|68|20|rim
      Joe Ingles|SF|66|39|shooter
    `),
    team('nop', 'New Orleans', 'Pelicans', S, ['#0C2340', '#C8102E'], `
      Zion Williamson|PF|85|26|slasher|35
      Trey Murphy III|SF|84|26|shooter
      Herbert Jones|SF/SG|81|28|defender|60
      Dejounte Murray|PG|80|30|twoway|45
      Jordan Poole|SG|78|27|scorer
      Derik Queen|C/PF|76|21|big
      Jeremiah Fears|PG|76|20|scorer
      Yves Missi|C|75|22|rim
      Saddiq Bey|SF/PF|74|27|scorer|60
      Jose Alvarado|PG|73|28|defender
      Jordan Hawkins|SG|71|24|shooter
      Kevon Looney|C|70|30|big
      Karlo Matković|PF|69|25|stretch
    `),
    team('nyk', 'New York', 'Knicks', S, ['#006BB6', '#F58426'], `
      Jalen Brunson|PG|91|30|scorer
      Karl-Anthony Towns|C/PF|88|30|stretch
      Mikal Bridges|SF/SG|84|30|twoway
      OG Anunoby|SF/PF|84|29|defender
      Josh Hart|SG/SF|81|31|twoway
      Mitchell Robinson|C|77|28|rim|35
      Miles McBride|PG|76|26|defender
      Jordan Clarkson|SG|74|34|scorer
      Guerschon Yabusele|PF|73|30|stretch
      Landry Shamet|SG|70|29|shooter
      Tyler Kolek|PG|70|25|playmaker
      Pacôme Dadiet|SF|68|21|wing3d
      Mohamed Diawara|SF|66|21|defender
    `),
    team('okc', 'Oklahoma City', 'Thunder', S, ['#007AC1', '#EF3B24'], `
      Shai Gilgeous-Alexander|PG|97|28|scorer
      Jalen Williams|SF/SG|88|25|twoway
      Chet Holmgren|C/PF|87|24|unicorn|55
      Isaiah Hartenstein|C|81|28|big
      Cason Wallace|PG/SG|79|22|defender
      Luguentz Dort|SG/SF|79|27|defender
      Alex Caruso|PG/SG|78|32|defender
      Aaron Wiggins|SG/SF|76|27|twoway
      Isaiah Joe|SG|76|27|shooter
      Ajay Mitchell|PG|76|24|scorer
      Jaylin Williams|PF/C|74|24|stretch
      Kenrich Williams|PF|71|31|defender
      Thomas Sorber|C|70|20|rim
    `),
    team('orl', 'Orlando', 'Magic', S, ['#0077C0', '#C4CED4'], `
      Paolo Banchero|PF|88|23|scorer
      Franz Wagner|SF|87|25|twoway
      Desmond Bane|SG|84|28|shooter
      Jalen Suggs|PG|82|25|defender|45
      Wendell Carter Jr.|C|79|27|big
      Anthony Black|PG|78|22|defender
      Jonathan Isaac|PF|76|28|defender|45
      Goga Bitadze|C|75|27|rim
      Tristan da Silva|SF|74|25|wing3d
      Tyus Jones|PG|72|30|playmaker
      Moritz Wagner|C|72|29|stretch|55
      Jett Howard|SF|70|22|shooter
      Jase Richardson|PG|70|20|scorer
    `),
    team('phi', 'Philadelphia', '76ers', S, ['#006BB6', '#ED174C'], `
      Tyrese Maxey|PG|90|25|scorer
      Joel Embiid|C|87|32|scorer|25
      Paul George|SF/PF|80|36|twoway|45
      VJ Edgecombe|SG|80|21|slasher
      Quentin Grimes|SG|78|26|twoway
      Kelly Oubre Jr.|SF|77|30|slasher
      Jared McCain|PG/SG|77|22|shooter|55
      Andre Drummond|C|72|33|big
      Dominick Barlow|PF|72|23|rim
      Adem Bona|C|72|23|rim
      Trendon Watford|PF|71|25|point
      Justin Edwards|SF|70|22|wing3d
      Kyle Lowry|PG|66|40|playmaker
    `),
    team('phx', 'Phoenix', 'Suns', S, ['#1D1160', '#E56020'], `
      Devin Booker|SG|89|29|scorer
      Jalen Green|SG|82|24|scorer
      Mark Williams|C|79|24|rim|35
      Dillon Brooks|SF|78|30|defender
      Grayson Allen|SG|76|30|shooter
      Collin Gillespie|PG|76|27|shooter
      Royce O'Neale|SF/PF|74|33|wing3d
      Ryan Dunn|SF|74|23|defender
      Khaman Maluach|C|72|19|rim
      Oso Ighodaro|PF/C|72|24|point
      Nick Richards|C|72|28|rim
      Jordan Goodwin|SG/PG|72|27|defender
      Rasheer Fleming|PF|69|22|stretch
    `),
    team('por', 'Portland', 'Trail Blazers', S, ['#E03A3E', '#000000'], `
      Deni Avdija|SF/PF|87|25|point
      Shaedon Sharpe|SG|82|23|slasher
      Damian Lillard|PG|82|36|scorer|55
      Donovan Clingan|C|81|22|rim
      Jrue Holiday|PG/SG|80|36|defender|60
      Toumani Camara|SF/PF|80|26|defender
      Jerami Grant|PF|79|32|scorer
      Scoot Henderson|PG|76|22|slasher|55
      Robert Williams III|C|73|29|rim|30
      Matisse Thybulle|SG|72|29|defender|50
      Kris Murray|PF|70|26|defender
      Yang Hansen|C|70|21|point
      Blake Wesley|PG|69|23|defender
    `),
    team('sac', 'Sacramento', 'Kings', S, ['#5A2D81', '#63727A'], `
      Domantas Sabonis|C|85|30|point
      Zach LaVine|SG|83|31|scorer
      DeMar DeRozan|SF|82|37|scorer
      Keegan Murray|PF/SF|80|26|wing3d
      Malik Monk|SG|78|28|scorer
      Dennis Schröder|PG|76|33|scorer
      Russell Westbrook|PG|75|38|slasher
      Keon Ellis|SG|75|26|defender
      Devin Carter|PG|72|24|defender
      Nique Clifford|SG|71|24|twoway
      Dario Šarić|PF|70|32|stretch
      Maxime Raynaud|C|70|23|big
      Drew Eubanks|C|69|29|rim
    `),
    team('sas', 'San Antonio', 'Spurs', S, ['#C4CED4', '#000000'], `
      Victor Wembanyama|C|97|22|unicorn|70
      De'Aaron Fox|PG|86|28|slasher
      Stephon Castle|PG/SG|84|21|twoway
      Dylan Harper|SG/PG|82|20|scorer
      Devin Vassell|SG|79|26|wing3d
      Keldon Johnson|SF|78|26|slasher
      Harrison Barnes|PF/SF|75|34|wing3d
      Jeremy Sochan|PF|75|23|defender
      Julian Champagnie|SF|75|25|shooter
      Luke Kornet|C|74|31|rim
      Kelly Olynyk|C/PF|71|35|stretch
      Carter Bryant|SF|70|20|defender
      Jordan McLaughlin|PG|68|30|playmaker
    `),
    team('tor', 'Toronto', 'Raptors', S, ['#CE1141', '#000000'], `
      Scottie Barnes|SF/PF|87|25|twoway
      Brandon Ingram|SF|83|29|scorer|55
      RJ Barrett|SF/SG|81|26|slasher
      Immanuel Quickley|PG|80|27|scorer
      Jakob Pöltl|C|80|30|rim
      Collin Murray-Boyles|PF|75|21|defender
      Gradey Dick|SG|75|22|shooter
      Ochai Agbaji|SG/SF|74|26|wing3d
      Jamal Shead|PG|74|24|defender
      Sandro Mamukelashvili|PF/C|73|27|stretch
      Ja'Kobe Walter|SG|72|22|wing3d
      Jamison Battle|SF|70|25|shooter
      Garrett Temple|SG|65|40|defender
    `),
    team('uta', 'Utah', 'Jazz', S, ['#002B5C', '#F9A01B'], `
      Lauri Markkanen|PF/SF|86|29|shooter
      Keyonte George|PG|82|23|scorer
      Walker Kessler|C|81|25|rim|50
      Ace Bailey|SF|77|20|scorer
      Isaiah Collier|PG|75|22|playmaker
      Jusuf Nurkić|C|74|32|big
      Brice Sensabaugh|SF|74|23|scorer
      Kyle Anderson|PF|72|33|point
      Svi Mykhailiuk|SG|72|29|shooter
      Taylor Hendricks|PF|72|23|defender
      Cody Williams|SF|72|21|wing3d
      Walter Clayton Jr.|PG|72|23|shooter
      Kevin Love|PF|68|38|stretch
    `),
    team('was', 'Washington', 'Wizards', S, ['#002B5C', '#E31837'], `
      Anthony Davis|PF/C|89|33|unicorn|40|?
      Trae Young|PG|86|28|playmaker|80|?
      Alex Sarr|C|80|21|rim
      Bilal Coulibaly|SF/SG|79|22|defender
      Tre Johnson|SG|76|20|shooter
      Bub Carrington|PG|75|21|playmaker
      Kyshawn George|SF|75|22|wing3d
      D'Angelo Russell|PG|75|30|scorer|80|?
      Cam Whitmore|SF|73|22|slasher
      Justin Champagnie|SF/PF|72|25|defender
      Will Riley|SF|70|20|scorer
      Tristan Vukčević|C|70|23|stretch
      Anthony Gill|PF|67|34|defender
    `),
    team('rookies', '2026', 'Draft Class', S, ['#3DF2C2', '#E8833A'], `
      AJ Dybantsa|SF|80|19|scorer|80|?
      Darryn Peterson|SG/PG|80|19|scorer|80|?
      Cameron Boozer|PF|79|19|twoway|80|?
      Caleb Wilson|PF/SF|76|20|slasher|80|?
      Kingston Flemings|PG|75|19|slasher|80|?
      Mikel Brown Jr.|PG|74|20|playmaker|80|?
      Nate Ament|SF/PF|74|19|scorer|80|?
      Koa Peat|PF|74|19|slasher|80|?
      Darius Acuff Jr.|PG|74|19|scorer|80|?
      Braylon Mullins|SG|72|20|shooter|80|?
      Tounde Yessoufou|SF/SG|72|20|slasher|80|?
      Chris Cenac Jr.|C|72|19|big|80|?
      Jayden Quaintance|C|72|19|rim|50|?
    `),
  ],
};

// The rookie class is a spinnable "team" until 2026 draft assignments are verified.
current2026.teams[current2026.teams.length - 1].id = 'rookies-2026';
