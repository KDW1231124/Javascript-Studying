describe('ContractRegistry', function() {
  var ContractRegistry = ReliableJavaScript.ContractRegistry,
      registry,
      isArray = 'isArray',
      ary = [1,2,3];

  beforeEach(function() {
    registry = new ReliableJavaScript.ContractRegistry();
    registry.define(isArray,Array.isArray);
  });

  describe('생성', function() {
    it('new로 만들어야 한다', function() {
      expect(function() {
        ContractRegistry();
      }).toThrow(new Error(ContractRegistry.messages.newRequired));
    });
  });

  describe('define(contractName,evaluator)', function() {

    it('contractName이 문자열이 아니면 예외를 던진다', function() {
      expect(function() {
        registry.define(undefined, function() {});
      }).toThrow(new Error(ContractRegistry.messages.nameMustBeString));
    });

    it('evaluator가 함수가 아니면 예외를 던진다', function() {
      expect(function() {
        registry.define('myContract','함수 아니지롱');
      }).toThrow(new Error(ContractRegistry.messages.evaluatorMustBeFunction));
    });

    it('contractName이 문자열이고 evaluator가 함수면 예외를 던지지 않는다', function() {
      expect(function() {
        registry.define('myContract', function() {});
      }).not.toThrow();
    });

    it('체이너블한 registry를 반환한다', function() {
      expect(registry.define('x',Array.isArray)).toBe(registry);
    });
  });

  describe('fulfills(contractName,obj)', function() {

    it('contractName이 레지스트리에 없으면 예외를 던진다', function() {
      function expectThrow(contractName) {
        expect(function() {
          registry.fulfills(contractName,{});
        }).toThrow(new Error(
          registry.getMessageForNameNotRegistered(contractName)));
      }
      [undefined,'abc'].forEach(expectThrow);
    });

    it('객체가 규약을 지키면 true를 반환한다', function() {
      expect(registry.fulfills(isArray,ary)).toBe(true);
    });

    it('객체가 규약을 위반하면 false를 반환한다', function() {
      expect(registry.fulfills(isArray,'not an array')).toBe(false);
    });
  });

  describe('assert(contractName, obj)', function() {
    it('fulfills(contractName, obj)에 기반을 둔다', function() {
      spyOn(registry,'fulfills').and.callThrough();
      registry.assert(isArray,ary);
      expect(registry.fulfills).toHaveBeenCalledWith(isArray,ary);
    });
    it('객체가 규약을 지키면 예외를 던지지 않는다', function() {
      registry.assert(isArray,ary);
    });
    it('객체가 규약을 위반하면 예외를 던진다', function() {
      var notAnArray = 'abc';
      expect(function() {
        registry.assert(isArray,notAnArray);
      }).toThrow(new Error(
        registry.getMessageForFailedContract(isArray,notAnArray)));
    });

    it('체이너블한 registry를 반환한다', function() {
      expect(registry.assert(isArray,ary)).toBe(registry);
    });
  });

  describe('multipleFulfills(validator,args)', function() {

    describe('인자 검사 기능', function() {

      it('validator가 문자열, 문자열 배열, 함수 중 어떤 것도 아니면 예외를 던진다', function() {
        function expectThrow(badValidator) {
          expect(function() {
            registry.multipleFulfills(badValidator,[]);
          }).toThrow(new Error(ContractRegistry.messages.validatorsInvalid));
        }
        [ undefined,
          null,
          123,
          ['xyz',0/*문자열 아님*/],
          { 'an': 0, 'object': 1 }
        ].forEach(expectThrow);
      });

      it('args가 유사 배열이 아닐 경우 예외를 던진다', function() {
        function expectThrow(badArgs) {
          expect(function() {
            registry.multipleFulfills(function() {},badArgs);
          }).toThrow(new Error(ContractRegistry.messages.argsMustBeArrayLike));
        }
        [ undefined,
          null,
          123,
          function() {},
          'a string',
          { 'an': 0, 'object': 1 },
        ].forEach(expectThrow);
      });
    });

    describe('validator가 문자열일 경우', function() {
      it('fulfills(validator,args)의 결과를 반환한다', function() {
        var validator='어떤규약명',
            args = ['a','b'],
            returnFromFulfills = 'true 아니면 false겠지';
        spyOn(registry,'fulfills').and.returnValue(returnFromFulfills);
        expect(registry.multipleFulfills(validator,args))
          .toBe(returnFromFulfills);
        expect(registry.fulfills).toHaveBeenCalledWith(validator,args);
      });
    });

    describe('validator가 배열일 경우', function() {
      function passOrFail(contractName, arg) {
        return contractName==='passes';
      }
      it('빈 배열이면 true를 반환한다', function() {
        expect(registry.multipleFulfills([],[1,2,3]))
          .toBe(true);
      });

      it('validator가 원소가 하나뿐인 배열이고 해당 규약이 모두 pass면 true를 반환한다', function() {
        var validator=['passes,passes,passes'],
            args = [1,2,3];
        spyOn(registry,'fulfills').and.callFake(passOrFail);
        expect(registry.multipleFulfills(validator,args)).toBe(true);
        expect(registry.fulfills).toHaveBeenCalledWith('passes',1);
        expect(registry.fulfills).toHaveBeenCalledWith('passes',2);
        expect(registry.fulfills).toHaveBeenCalledWith('passes',3);
      });

      it('validator가 원소가 하나뿐인 배열이고 해당 규약 중 하나가 fail이면 false를 반환한다', function() {
        var validator=['passes,fails,passes'],
            args = [1,2,3];
        spyOn(registry,'fulfills').and.callFake(passOrFail);
        expect(registry.multipleFulfills(validator,args)).toBe(false);
        expect(registry.fulfills).toHaveBeenCalledWith('passes',1);
        expect(registry.fulfills).toHaveBeenCalledWith('fails',2);
        // 두 번째 인자가 실패하면 false로 확정되므로 2회만 호출된다
        expect(registry.fulfills.calls.count()).toBe(2);
      });

      it('원소가 하나뿐인 배열에서 필요 이상 규약을 평가하지 않는다', function() {
        var validator=['passes,fails,passes'],
            args = [1,2,3];
        spyOn(registry,'fulfills').and.callFake(passOrFail);
        expect(registry.multipleFulfills(validator,args)).toBe(false);
        // 두 번째 인자가 실패하면 false로 확정되므로 2회만 호출된다
        expect(registry.fulfills.calls.count()).toBe(2);
      });

      it('validator에서 콤마 주위에 있는 공백은 무시한다', function() {
        var validator=['a, b, c ,   d'],
            args = [1,2,3,4];
        spyOn(registry,'fulfills').and.returnValue(true);
        registry.multipleFulfills(validator,args);
        expect(registry.fulfills).toHaveBeenCalledWith('a',1);
        expect(registry.fulfills).toHaveBeenCalledWith('b',2);
        expect(registry.fulfills).toHaveBeenCalledWith('c',3);
        expect(registry.fulfills).toHaveBeenCalledWith('d',4);
      });

      it('validator에서 콤마가 연속된 곳에 있는 원소는 검사를 건너뛴다', function() {
        var validator=['a,, , d'],
            args=[1,2,3,4];
        spyOn(registry,'fulfills').and.returnValue(true);
        registry.multipleFulfills(validator,args);
        expect(registry.fulfills).toHaveBeenCalledWith('a',1);
        expect(registry.fulfills).toHaveBeenCalledWith('d',4);
        expect(registry.fulfills.calls.count()).toBe(2);
      });

      it('콤마로 구분된 규약명을 평가 시 남는 인자는 무시한다', function() {
        var validator=['a,b'],
            args=[1,2,3];
        spyOn(registry,'fulfills').and.returnValue(true);
        registry.multipleFulfills(validator,args);
        expect(registry.fulfills).toHaveBeenCalledWith('a',1);
        expect(registry.fulfills).toHaveBeenCalledWith('b',2);
        expect(registry.fulfills.calls.count()).toBe(2);
      });

      it('args가 콤마로 구분된 규약명 문자열의 배열 중 한 원소라도 지키면 규약을 지키는 것으로 본다', function() {
        var validator=[
              'passes,fails',
              'passes,passes',
              'fails,fails'
            ],
            args = [1,2];
        spyOn(registry,'fulfills').and.callFake(passOrFail);
        expect(registry.multipleFulfills(validator,args)).toBe(true);
        expect(registry.fulfills.calls.count()).toBe(4);
      });
    });

    describe('validator가 함수일 경우', function() {
      var args = ['a','b'];

      it('args에 대한 validator의 호출 결과를 반환한다', function() {
        function isLength2() {
          return arguments.length === 2;
        }
        function isLength3() {
          return arguments.length === 3;
        }
        expect(registry.multipleFulfills(isLength2,args)).toBe(true);
        expect(registry.multipleFulfills(isLength3,args)).toBe(false);
      });

      it('registry를 콘텍스트로 validator를 호출한다', function() {
        function calledOnRegistry() {
          expect(this).toBe(registry);
        }
        registry.multipleFulfills(calledOnRegistry,args);
      });
    });
  });

  describe('multipleAssert(validator,args)', function() {
    it('multipleFulfills(validator,args)가 false를 반환하면 예외를 던진다', function() {
      var validator='contractName',
          args = [123];
      spyOn(registry,'multipleFulfills').and.returnValue(false);
      expect(function() {
        registry.multipleAssert(validator,args);
      }).toThrow(new Error(ContractRegistry.messages.argsFailedContract));
      expect(registry.multipleFulfills).toHaveBeenCalledWith(validator,args);
    });

    it('multipleFulfills(validator,args)가 true를 반환하면 예외를 던지지 않는다', function() {
      var validator='contractName',
          args = [123];
      spyOn(registry,'multipleFulfills').and.returnValue(true);
      registry.multipleAssert(validator,args); // 예외를 던지지 않음
      expect(registry.multipleFulfills).toHaveBeenCalledWith(validator,args);
    });

   it('체이너블한 registry를 반환한다', function() {
      expect(registry.multipleAssert(isArray,[])).toBe(registry);
    });
  });

  describe('attachArgumentsValidator(funcName, funcObj, validator)', function() {
    var funcName = 'func',
        funcObj,
        isString = 'isString', isLetter = 'isLetter', hasLength='hasLength',
        contractNames = [isString, isLetter, hasLength];

    beforeEach(function() {
      funcObj = {};
      funcObj[funcName] = function() {
        return Array.prototype.slice.call(arguments,0);
      };
    });

    describe('인자 검사 기능', function() {

      it('funcName이 문자열이 아닐 경우 예외를 던진다', function() {
        function expectThrow(contractName) {
          expect(function() {
            registry.attachArgumentsValidator(
              12345,funcObj,contractNames);
          }).toThrow(new Error(ContractRegistry.messages.funcNameMustBeString));
        }
        [undefined, function() {},123].forEach(expectThrow);
      });

      it('funcObj가 함수가 아닐 경우 예외를 던진다', function() {
        function expectThrow(obj) {
          expect(function() {
            registry.attachArgumentsValidator(funcName,obj,contractNames);
          }).toThrow(new Error(ContractRegistry.messages.funcObjMustBeObject));
        }
        [undefined,'abc',123].forEach(expectThrow);
      });

      it('validator가 문자열, 문자열 배열, 함수 중 어떤 것도 아니면 예외를 던진다', function() {
        function expectThrow(names) {
          expect(function() {
            registry.attachArgumentsValidator(funcName,funcObj,names);
          }).toThrow(new Error(ContractRegistry.messages.validatorsInvalid));
        }
        [ undefined,
          null,
          123,
          ['xyz',0/*문자열 아님*/],
          { 'an': 0, 'object': 1 }
        ].forEach(expectThrow);
      });
    });

    describe('애스팩트 기능', function() {
      var obj;
      beforeEach(function() {
        obj = {
          prop: 123,
          func: function func() {
            return arguments[0]+arguments[1];
          }
       };
      });

      it('registry.multipleAssert(validator,arguments)를 호출한다', function() {
        function validator(args) {
          return this.prop === 123;
        }
        registry.attachArgumentsValidator('func',obj,validator);
        spyOn(registry,'multipleAssert').and.callFake(function(val,args) {
          expect(val).toBe(validator);
          expect(args.length).toBe(2);
          expect(args[0]).toBe('a');
          expect(args[1]).toBe('b');
        });
        obj.func('a','b');
        expect(registry.multipleAssert).toHaveBeenCalled();
      });

      it('함수는 정상적으로 실행 및 반환시킨다', function() {
        function validator(args) {
          return true;
        }
        registry.attachArgumentsValidator('func',obj,validator);
        spyOn(registry,'multipleAssert').and.returnValue(undefined);
        expect(obj.func('a','b')).toBe('ab');
      });
    });

    it('체이너블한 registry를 반환한다', function() {
      expect(registry.attachArgumentsValidator(funcName,funcObj,contractNames))
        .toBe(registry);
    });
  });

  describe('attachReturnValidator(funcName, funcObj, contractName)',
  function() {
    var funcName = 'func',
        funcObj,
        returnValue = [1,2,3];

    beforeEach(function() {
      funcObj = {};
      funcObj[funcName] = function() {
        return returnValue;
      };
    });

    it('체이너블한 registry를 반환한다', function() {
      expect(registry.attachReturnValidator(funcName,funcObj,isArray))
        .toBe(registry);
    });

    describe('인자 검사 기능', function() {

      it('funcName이 문자열이 아닐 경우 예외를 던진다', function() {
        function expectThrow(contractName) {
          expect(function() {
            registry.attachReturnValidator(
              12345,funcObj,isArray);
          }).toThrow(new Error(ContractRegistry.messages.funcNameMustBeString));
        }
        [undefined, function() {},123].forEach(expectThrow);
      });

      it('funcObj가 함수가 아닐 경우 예외를 던진다', function() {
        function expectThrow(obj) {
          expect(function() {
            registry.attachReturnValidator(funcName,obj,isArray);
          }).toThrow(new Error(ContractRegistry.messages.funcObjMustBeObject));
        }
        [undefined,'abc',123].forEach(expectThrow);
      });

      it('contractName이 문자열이 아닐 경우 예외를 던진다', function() {
        function expectThrow(name) {
          expect(function() {
            registry.attachReturnValidator(funcName,funcObj,name);
          }).toThrow(new Error(ContractRegistry.messages.nameMustBeString));
        }
        [ undefined,
          123,
          function() {},
          []
        ].forEach(expectThrow);
      });
    });

    describe('애스팩트 기능', function() {

      it('반환값이 규약을 지키면 이를 반환한다', function() {
        registry.attachReturnValidator(funcName,funcObj,isArray);
        expect(funcObj[funcName]()).toEqual(returnValue);
      });

      it('반환값이 규약을 위반하면 예외를 던진다', function() {
        var isNumber = 'isNumber';
        registry.define(isNumber, function isNumber(ret) {
          return typeof ret === 'number';
        });
        registry.attachReturnValidator(funcName, funcObj, isNumber);
        expect(function() {
          funcObj[funcName]();
        }).toThrow(new Error(
          registry.getMessageForFailedContract(isNumber,returnValue)));
      });
    });
  });
});