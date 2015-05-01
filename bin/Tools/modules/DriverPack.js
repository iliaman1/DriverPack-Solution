var DriverPack = {
    driverPath: AppData + '\\DRPSu\\DRIVERS',
    not_installed: [],
    installed: [],
    not_versions: [],
	_json: [],
	getDevType: function(DevID) {
		if (DevID.indexOf("VEN")  != -1) { return "PCI"; }
		if (DevID.indexOf("VID")  != -1) { return "USB"; } 
		if (DevID.indexOf("ACPI") != -1) { return "ACPI"; }
		if (DevID.indexOf("PNP")  != -1) { return "PNP"; }
		if (DevID.indexOf("IDE")  != -1) { return "IDE"; }
		if (DevID.indexOf("USB")  != -1) { return "USB"; }
		if (DevID.indexOf("ROOT") != -1) { return "ROOT"; }
		if (DevID.indexOf("SCSI") != -1) { return "SCSI"; }
		if (DevID.indexOf("STORAGE") != -1) { return "STORAGE"; }
		if (DevID.indexOf("MONITOR") != -1) { return "MONITOR"; }
		return "UNK";
    },

    /*
		driverDetect()
		Сканирует устройства компьютера и получает их DeviceID.
		
		ToDo:
		- Эта функция довольно требовательна к ресурсам и нужнается в оптимизации
		- IE10+ может использовать Web Workers
		- Вместо setTimeout() использовать setImmediate(), это может улучшить скорость на ~500мс.
    */
	driverDetect: function(callback){
		
		
		/*
		ClassGuid, CompatID, Description, DeviceClass, DeviceID, DeviceName, DriverDate, DriverProviderName, DriverVersion, HardWareID, InfName, IsSigned, Location, Manufacturer, Signer, 
		*/

		/*
		var start = new Date();
		//var DrivercolItems = objWMIService.ExecQuery("SELECT HardWareID FROM Win32_PnPSignedDriver WHERE HardWareID != null AND (HardWareID LIKE 'PCI%' OR HardWareID LIKE 'HDAUDIO%' OR HardWareID LIKE 'USB%' OR HardWareID LIKE 'ACPI%' OR HardWareID LIKE '*%')", "WQL");
		var DrivercolItems = objWMIService.ExecQuery("SELECT * FROM  Win32_PnPSignedDriver WHERE HardWareID != null", "WQL");
		var DriverenumItems = new Enumerator(DrivercolItems);
		
		var i = 0;
        for (; !DriverenumItems.atEnd(); DriverenumItems.moveNext()) {
			//var devid = DriverenumItems.item().DeviceID.toString().toUpperCase();
			var driverItem = DriverenumItems.item();
			var driverDeviceID = driverItem.HardWareID.toString().toUpperCase()

			if ((driverDeviceID.indexOf('PCI\\')==0) || (driverDeviceID.indexOf('USB\\')==0) || (driverDeviceID.indexOf('HDAUDIO\\')==0) || (driverDeviceID.indexOf('ACPI\\')==0) || (driverDeviceID.indexOf('*')==0)) {
				//Добавляем устройства только таких типов: PCI, USB, HDAUDIO, ACPI
				
				if (this.installed.indexOf(driverDeviceID) == -1){ //Только уникальные DeviceID
					//this.installed[i++] = driverDeviceID;
				}
				
			}
        }
		
		var end = new Date();
		alert('Speed driverDetect(): ' + (end.getTime()-start.getTime()) + ' ms');
		*/
		
		
		log('DriverPack.driverDetect() - start');
		var start = new Date();
		
		var DrivercolItems = objWMIService.ExecQuery("SELECT * FROM  Win32_PnPSignedDriver WHERE HardWareID != null", "WQL");
		var DriverenumItems = new Enumerator(DrivercolItems);
		DriverenumItems.moveFirst();
		
		var counter = 0,
			limit = 1000000000,
			handle,
			action = function(){
				if ((DriverenumItems.atEnd() == true) || (counter >= limit)){
					
					log('DriverPack.driverDetect() - end');
					log('DriverPack.installed JSON',DriverPack.installed);
					callback();
					
					clearTimeout(handle);
					return;
				}
				
				
				for (var i = 0; i < 5 && DriverenumItems.atEnd() == false; i++) {
					
					var driverItem = DriverenumItems.item();
					var driverDeviceID = driverItem.HardWareID.toString().toUpperCase();
					
					if ((driverDeviceID.indexOf('PCI\\')==0) || (driverDeviceID.indexOf('USB\\')==0) || (driverDeviceID.indexOf('HDAUDIO\\')==0) || (driverDeviceID.indexOf('ACPI\\')==0) || (driverDeviceID.indexOf('*')==0)) {
						//Добавляем устройства только таких типов: PCI, USB, HDAUDIO, ACPI
						
						if (DriverPack.installed.indexOf(driverDeviceID) == -1){ //Только уникальные DeviceID
							DriverPack.installed[DriverPack.installed.length] = driverDeviceID;
						}
						
					}
					
					DriverenumItems.moveNext();
				}
				
				
				counter++;
				handle = setTimeout(action, 0);
			};
		
		action();
		
		
	},

	
	/*
		init()
		Запускать процесс сканирования компьютера, отправляет информацию об устройствах на сервер. Принимает JSON ответ.
	*/
    init: function (callback) {
		log('DriverPack.init()');
		
		DriverPack.driverDetect(function(){
			
			//document.getElementById('loader').style.display = 'none';
			log("JSON drivers:",DriverPack.installed);
			
			
			var data = {
				not_installed: JSON.stringify(DriverPack.not_installed).replace(/\\\\/ig,"-"),
				installed: JSON.stringify(DriverPack.installed).replace(/\\\\/ig,"-"),
				version: (is64 ? '64': '32'),
				os: (OSVersion=='6.1'?'7':OSVersion)
			};
			var get = Object.keys(data).map(function (k) {
				return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
			}).join('&');
			
			
			
			
			log('JSONp URL:', [ 'http://test-st.drp.su/drivers/response.php?' + get + '&callback' ] );
			JSONP(
				'http://test-st.drp.su/drivers/response.php?' + get + '&callback',
				function(json){
					
					log('DriverPack.init() - JSONP response:',json);
					DriverPack.loadDB(json);
					DriverPack.detectDownloaded();
					
					callback();
					
				}
			);
			
			
			
		});
		
        /*echo('  DriverPack.init();');
         echo('  test(JSON.stringify(DriverPack._db), \'' + JSON.stringify(DriverPack._db) + '\');');*/
    },
	
	
	
	/*
		detectDownloaded()
		Проходится по всей базе и расставляет свойство isDownloaded тем, которые уже были скачанны.
	*/
	detectDownloaded: function () {
		
		var check = DriverPack.get({
			'SELECT': '*'
		});
		log('DriverPack.detectDownloaded() - start:',DriverPack._json);
		
		check.forEach(function(item, i, check) {
			
			//isDownloaded
			DriverPack._json[i].isDownloaded = false;
			if (driver_exists(item.URL,DriverPack.driverPath)) {
				DriverPack._json[i].isDownloaded = true;
			}
			
		});
		
		log('DriverPack.detectDownloaded() - end:',DriverPack._json);
	},
	
	
	/*
		download()
		Скачивает драйверы из массива IDs.

		ToDo:
		- Убрать вызов statistics.event отсюда
		- Убрать вызов progressCounter отсюда
	*/
	download: function (IDs, callback) {
		
		var url = DriverPack.get({
			'SELECT': '*',
			'WHERE': IDs
		});
		
		
		setTimeout(
			function(){
				log('Started downloading IDs: ' + IDs);
				statistics.event(
					{
						category: 'desktop',
						action: 'drivers installation started',
						label: statistics.drpVersion
					},
					[
						[
							statistics.config.userIdDimension,
							statistics.clientId
						],
						[
							statistics.config.driverDimension,
							statistics.drpVersion
						]
					]
				);
				//Событие: beforeAllDownloading
				
				url.forEach(function(item,i,url) {
					
					setTimeout(function(){
					    progressCounter.start({
					        startCount: (i==0?1:progressCounter.settings.endCount),
					        endCount: Math.floor(80/url.length*(i+1)) // (80/arr.lenght*i)
					    });
					}, 10);

					log('Downloading: ' + item.URL + '. To folder: ' + DriverPack.driverPath);
					
					statistics.event(
						{
							category: 'desktop',
							action: 'drivers installation started ' + item.Name,
							label: statistics.drpVersion
						},
						[
							[
								statistics.config.userIdDimension,
								statistics.clientId
							],
							[
								statistics.config.driverDimension,
								item.Name
							]
						]
					);

					//Событие: beforeDownloading(item.Name)
					
					wget_driver(item.URL,DriverPack.driverPath);
					//DriverPack._json[i].isDownloaded = true; //Не работает, так как индексы в массивах разные
					
					//Событие: afterDownloading(item.Name)

					statistics.event(
                        {
                            category: 'desktop',
                            action: 'drivers installation downloaded ' + item.Name,
                            label: statistics.drpVersion
                        },
						[
							[
								statistics.config.userIdDimension,
								statistics.clientId
							],
							[
								statistics.config.driverDimension,
								item.Name
							]
						]
					);
					
					
				});
				

				//Событие: afterAllDownloading()
				
				statistics.event(
					{
						category: 'desktop',
						action: 'drivers installation downloaded',
						label: statistics.drpVersion
					},
					[
						[
							statistics.config.userIdDimension,
							statistics.clientId
						],
						[
							statistics.config.driverDimension,
							statistics.drpVersion
						]
					]
				);
				
				callback();
				
			},
			0
		);
		
	},
	
	
	/*
		install()
		Устанавливает драйверы с номерами из массива IDs.
	*/
	install: function (IDs, callback) {
		
		var installed = DriverPack.get({
			'SELECT': '*',
			'WHERE': IDs
		});

		//Событие: beforeInstalling()
		
		
		setTimeout(
			function(){
				
				
				// Cleaning
				WshShell.Run('cmd /c rd /S /Q "' + WshShell.ExpandEnvironmentStrings('%temp%\\drp\\unzip\\drp') + '"', 0, true);
				// Unzip
				WshShell.Run('tools\\7za.exe x -yo"' + WshShell.ExpandEnvironmentStrings('%temp%\\drp\\unzip\\drp') + '" "' + DriverPack.driverPath + '\\*"', 0, true);
				// Installing drivers
				WshShell.Run(
					'"' + WshShell.ExpandEnvironmentStrings('%temp%\\drp\\unzip\\drp\\dpinst\\Setup') + '' + (is64 ? '64' : '') + '.exe" ' +
					'/SW /c /sa /PATH "' + WshShell.ExpandEnvironmentStrings('%temp%\\drp\\unzip') + '"',
					0,true
				);
				
				statistics.event(
					{
						category: 'desktop',
						action: 'drivers installation completed',
						label: statistics.drpVersion
					},
					[
						[
							statistics.config.userIdDimension,
							statistics.clientId
						],
						[
							statistics.config.driverDimension,
							statistics.drpVersion
						]
					]
				);

				//Событие: afterInstalling()
				
				callback();
			},
			0
		);
		
		return true;
		
	},
	
	
	
	
	

	
	
	loadDB: function (json) {
			
			
			//return false;
			json = cloneObj(json);
			
			log("loadDB():",json);
			var output = {installed: new Array(), not_installed: new Array()},
			inst = json.installed.length, ninst = json.not_installed.length, tmp;
			tmp = {
				URL: 'http://test-st.drp.su/drivers/dpinst.zip',
				Date: new Date().toString().replace(/\//g, "."),
				Name: 'dpinst.zip',
				ID: '0'
			};
			output.installed.push(tmp);
			for (var i = 0; i < inst; i++) {
				tmp = {
					URL: json.installed[i][0],
					Date: json.installed[i][1].toString().replace(/\//g, "."),
					Name: json.installed[i][2],
					ID: json.installed[i][3].replace(/-/ig,"\\")
				};
				output.installed.push(tmp);
			}
			for (var i = 0; i < ninst; i++) {
				tmp = {
					URL: json.not_installed[i][0],
					Date: json.not_installed[i][1].toString().replace(/\//g, "."),
					Name: json.not_installed[i][2],
					ID: json.not_installed[i][3].replace(/-/ig,"\\\\")
				};
				output.not_installed.push(tmp);
			}
			
			
			
			output_installed = output.installed;
			//Фиксим неправильный формат JSON,
			//это чтобы не переписывать на стороне сервера
			output_installed.forEach(function(item, i) {
				
				output_installed[i].DevID = output_installed[i].ID;
				output_installed[i].ID = i;
				
			});
			
			//Фильтруем дубликаты драйверов
			var output_installed_filtered = [];
			var urlArr = [];
			for (var i = 0; i < output_installed.length; i++) {
			
				if (urlArr.indexOf(output_installed[i].URL) == -1){
	
					output_installed_filtered[output_installed_filtered.length] = output_installed[i];
					urlArr[urlArr.length] = output_installed[i].URL;
	
				}
	
			}
			output_installed = output_installed_filtered;
	
	
	
			//echo(print_r(output));
			DriverPack._json = output_installed;
	
	},
	
	
	
	
	
		
		
		
		
		
		
	
    html: function () {
		
		document.getElementById("menu-drivers").className = document.getElementById("menu-drivers").className + ' green';
		document.getElementById("menu-soft").className = document.getElementById("menu-soft").className.replace(/\b green\b/ig,'');
		
		//alert("soft: " + document.getElementById("menu-soft").className + ' drivers: ' + document.getElementById("menu-drivers").className);
		
        document.getElementById('loader').style.display = 'block';
		//document.getElementById('loader').style.backgroundImage = (IEVers=='6'?'url(Tools/load8.gif)':'url(img/loading.gif)');
		document.getElementById('loader').style.backgroundImage = 'url(Tools/load8.gif)';
		window.scrollTo(0, 0);
        var newTbody = document.createElement('tbody');
		var newTbody = '';
		var drivers = DriverPack.get({ 'SELECT': '*' });
		
		for (var i = 1; i < drivers.length; i++) {
			
			if (!driver_exists(drivers[i].URL,DriverPack.driverPath)){
				newTbody += '<tr><td class="list-first"><input data-name="' + encodeURIComponent(drivers[i].Name)  + '" id="checkDrivers'+drivers[i].ID+'" type="checkbox" checked/> <img src="Tools/ico/button/' + DriverPack.getDriverIcon(drivers[i].URL) + '.png" /> </td>' +
						'<td class="list-second" title="' + drivers[i].DevID + '">' + drivers[i].Name + '</td>' +
						'<td class="list-third" title="' + drivers[i].URL + '"><b>' + drivers[i].Date + '</b></td>' +
						'<td class="list-last"></td>' +
						'</tr>';
			}
			
        }
		
		
		getDownloadInstall = function(){
			
			var IDs = [];
			IDs[IDs.length] = 0; //Тупой фикс, чтобы dpinst всегда устанавливался
			for (var i = 1; i < drivers.length; i++) {
				
				if (!driver_exists(drivers[i].URL,DriverPack.driverPath)){
					if (document.getElementById('checkDrivers'+drivers[i].ID).checked === true){
						IDs[IDs.length] = drivers[i].ID;
					}
				}
				
			}
			
			if (IDs.length < 2) { return false; }
			
			document.getElementById('loader').style.display = 'block';
			//document.getElementById('loader').style.backgroundImage = (IEVers=='6'?'url(Tools/load8.gif)':'url(img/loading.gif)');
			document.getElementById('loader').style.backgroundImage = 'url(Tools/load8.gif)';
			window.scrollTo(0, 0);
			document.getElementById('progressDescription').innerHTML = '<br>Скачиваю дрова...';
			//alert(JSON.stringify(IDs));
			log('Downloading drivers started...');
			DriverPack.download(
				IDs,
				function(){
					
					log('Downloaded drivers!');
					//alert('Готово, переходим к установке!');
					document.getElementById('progressDescription').innerHTML = '<br>Устанавливаю...';

					setTimeout(function(){
					    progressCounter.start({
					        startCount: 80,
					        endCount: 99
					    });
					}, 10);
					
					log('Installing started drivers...');
					DriverPack.install(
						IDs,
						function(){
							
							setTimeout(function(){
								progressCounter.start({
									startCount: 100,
									endCount: 100
								});
							}, 10);
							log('Installed drivers!');
							

							document.getElementById('loader').style.backgroundImage = "none";
							document.getElementById('progressDescription').innerHTML = 'Все драйверы установленны! <br><button onclick="DriverPack.init(function () { DriverPack.html(); })">Готово</button>';
							//document.getElementById('loader').style.display = 'none';
							//alert('Установка завершена!');
							
							//DriverPack.html();
							
						}
					);
					
				}
			);
		};
		
		
		
		
		document.getElementById('div-list').innerHTML = '<table id="list"><thead><tr><td></td><td>Название</td><td>Версия</td><td></td></tr></thead><tbody>'+newTbody+'</tbody></table>';
        document.getElementById('h1-title').innerHTML = 'Установка драйверов';
		document.getElementById('description').innerHTML = 'Найдены доступные для установки драйвера';
		document.getElementById('loader').style.display = 'none';
    },
	
	
	
	
	
	
	
	
	
	
	
	/*
		get()
		Возвращает записи из базы, которые соответствуют параметрам query: { WHERE, SELECT, LIMIT }.

		ToDo:
		- В идеале найти готовую либу, которая умеет тоже самое через Xpath или подобное.
	*/
	get: function (query) {
		
		var filteredArr = DriverPack._json;
		if (typeof(filteredArr) == 'undefined') { return false; }
		
		//Фильтруем массив только по полю ID
		//Например: 'WHERE': [ 1, 2, 3 ]
		if ((typeof(query.WHERE) == 'object') && ((typeof(query.WHERE[0]) == 'string') || (typeof(query.WHERE[0]) == 'number'))) {
			
			filteredArr = filteredArr.filter(function(obj) {
				
				for (var i = 0; i < query.WHERE.length; i++) {
					
					if (obj.ID == query.WHERE[i]){
						
						return true;
						
					}
				}
				
			});
			
		}
		//Фильтруем массив по любым полям
		//Например, 'WHERE': [ { 'ID': '5' }, { 'ID': '22' } ]
		else if (typeof(query.WHERE) != 'undefined') {
			
			
			filteredArr = filteredArr.filter(function(obj) {
				
				for (var i = 0; i < query.WHERE.length; i++) {
					
					//Где ищем
					subject = JSON.stringify(obj).toUpperCase();
					
					//Что ищем
					searchValue = JSON.stringify(query.WHERE[i]);
					searchValue = searchValue.substring(1,searchValue.length-1);
					searchValue = searchValue.toUpperCase();
					
					if (subject.indexOf(searchValue) != -1){
						
						return true;
						
					}
				}
				
			});
			
		}
		
		

		if (query.SELECT != '*') {
			
			for (var i = 0; i < filteredArr.length; i++) {
				
				//Сохраняем ключ и значение до того,
				//как удалим весь объект
				var key = query.SELECT;
				var value = filteredArr[i][query.SELECT];
				
				//Очищаем массив и заполняем только одним элементом
				filteredArr[i] = {};
				filteredArr[i][key] = value;
				
			}
			
		}
		

		if (typeof(query.LIMIT) != 'undefined') {
			
			//Обрезаем массив
			filteredArr = filteredArr.slice(0,query.LIMIT);
			
		}
		
		
		
		return filteredArr;
		

    },
	
	
	
	
	
	
	
	
	
	
	
	/*
		ToDo:
		- Эта функция здесь не нужна. Её нужно перенести в шаблон. Вернее даже, чтобы иконка через CSS классы подставлялась.
	*/
	getDriverIcon: function (driverUrl){
		driverIcon = "0";
		var driverUrl = driverUrl.toLowerCase();

		if (driverUrl.indexOf("audio") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("biometric") != -1) { driverIcon = "11"; }
		else if (driverUrl.indexOf("input") != -1) { driverIcon = "11"; }
		else if (driverUrl.indexOf("bluetooth") != -1) { driverIcon = "5"; }
		else if (driverUrl.indexOf("cardreader") != -1) { driverIcon = "14"; }
		else if (driverUrl.indexOf("smartcard") != -1) { driverIcon = "14"; }
		else if (driverUrl.indexOf("chipset") != -1) { driverIcon = "2"; }
		else if (driverUrl.indexOf("filter") != -1) { driverIcon = "2"; }
		else if (driverUrl.indexOf("cpu") != -1) { driverIcon = "2"; }
		else if (driverUrl.indexOf("wlan") != -1) { driverIcon = "13"; }
		else if (driverUrl.indexOf("massstorage") != -1) { driverIcon = "4"; }
		else if (driverUrl.indexOf("masstorage") != -1) { driverIcon = "4"; }
		else if (driverUrl.indexOf("misc") != -1) { driverIcon = "1"; }
		else if (driverUrl.indexOf("gaming") != -1) { driverIcon = "1"; }
		else if (driverUrl.indexOf("hid") != -1) { driverIcon = "11"; }
		else if (driverUrl.indexOf("modem") != -1) { driverIcon = "6"; }
		else if (driverUrl.indexOf("broadband") != -1) { driverIcon = "6"; }
		else if (driverUrl.indexOf("monitor") != -1) { driverIcon = "15"; }
		else if (driverUrl.indexOf("notebook") != -1) { driverIcon = "23"; }
		else if (driverUrl.indexOf("printer") != -1) { driverIcon = "16"; }
		else if (driverUrl.indexOf("scanner") != -1) { driverIcon = "17"; }
		else if (driverUrl.indexOf("sound_adi") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound_cmedia") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound_conexant") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound_creative") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound_idt") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound_via") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sounds_realtek") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sounds_hdmi") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("sound") != -1) { driverIcon = "8"; }
		else if (driverUrl.indexOf("phone") != -1) { driverIcon = "22"; }
		else if (driverUrl.indexOf("touchpad_alps") != -1) { driverIcon = "20"; }
		else if (driverUrl.indexOf("touchpad_cypress") != -1) { driverIcon = "20"; }
		else if (driverUrl.indexOf("touchpad_elan") != -1) { driverIcon = "20"; }
		else if (driverUrl.indexOf("touchpad_synaptics") != -1) { driverIcon = "20"; }
		else if (driverUrl.indexOf("touchpad") != -1) { driverIcon = "20"; }
		else if (driverUrl.indexOf("tv_aver") != -1) { driverIcon = "15"; }
		else if (driverUrl.indexOf("tv_beholder") != -1) { driverIcon = "15"; }
		else if (driverUrl.indexOf("tv_dvb") != -1) { driverIcon = "15"; }
		else if (driverUrl.indexOf("_tv") != -1) { driverIcon = "15"; }
		else if (driverUrl.indexOf("vendor") != -1) { driverIcon = "23"; }
		else if (driverUrl.indexOf("video_amd") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("video_intel") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("video_nvidia") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("video_server") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("video") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("graphics") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("runtimes") != -1) { driverIcon = "12"; }
		else if (driverUrl.indexOf("webcam") != -1) { driverIcon = "7"; }
		else if (driverUrl.indexOf("usb") != -1) { driverIcon = "10"; }
		else if (driverUrl.indexOf("lan_intel") != -1) { driverIcon = "9"; }
		else if (driverUrl.indexOf("lan_realtek") != -1) { driverIcon = "9"; }
		else if (driverUrl.indexOf("lan") != -1) { driverIcon = "9"; }

		return driverIcon;
	}
};


