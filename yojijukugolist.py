import codecs

with codecs.open("yojijukugo.txt", "r", "utf-8") as f:
	data = f.readlines()

orderedData = []
for d in data:
	tempd = d.split("\t")
	source = tempd[0]
	yojijukugo = tempd[1][:4]
	tempd = tempd[1].split("[", 1)[1].split("]", 1)
	pronounciation = tempd[0]
	tempd = tempd[1].split("(", 1)[1].split(")", 1)
	properties = tempd[0].split(",")
	tempd = tempd[1][1:]
	if "/" not in tempd:
		definitions = [tempd]
	else:
		definitions = tempd.split("/")
	definitions = list(map(lambda x: x.lower(), definitions))
	for i in range(len(definitions)): definitions[i] = definitions[i].replace(".", "").replace("!", "").replace("?", "")
	newDefinitions = []
	for i in range(len(definitions)):
		if ";" in definitions[i]:
			newDefinitions.extend(definitions[i].split(";"))
		else:
			newDefinitions.append(definitions[i])
	definitions = newDefinitions
	for i in range(len(definitions)):
		if definitions[i] == "":
			continue
		if definitions[i][0] == " ":
			definitions[i] = definitions[i][1:]
		if definitions[i][-1] == " ":
			definitions[i] = definitions[i][:-1]
	if definitions[0] == "" and len(definitions) == 1:
		continue
	elif definitions[-1] == "":
		definitions = definitions[:-1]
	elif definitions[-1] == "\r\n":
		definitions = definitions[:-1]
	orderedData.append([source, yojijukugo, pronounciation, properties, definitions])

print(orderedData)